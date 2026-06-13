// NMEA 0183 RMC センテンスパーサー（DigiSpice のテキスト出力等）
//
// 対応: $GPRMC / $GNRMC（GPS 単独 / GNSS 混合）
// - XOR チェックサム検証（不一致のセンテンスは黙ってスキップし件数を記録）
// - ステータス 'A'（有効測位）のみ採用
// - 座標 ddmm.mmmm / dddmm.mmmm → 度に変換、S/W は負値
// - 速度 ノット → km/h（× 1.852）
// - 時刻の日跨ぎ対応: 時刻フィールドが前サンプルより巻き戻ったら +86400s
//   （DigiSpice は JST をそのまま出力するため、UTC 前提のままでも
//    経過秒の計算には影響しない。実時刻の解釈は README 参照）

import { estimateSampleRateHz } from './derive';
import { TelemetryParseError, type TelemetryPoint, type TelemetrySession } from './types';

const FORMAT_LABEL = 'NMEA RMC';

/** ddmm.mmmm（緯度）/ dddmm.mmmm（経度）→ 度。不正なら null */
function parseNmeaCoord(raw: string, hemisphere: string, isLat: boolean): number | null {
  if (raw === '' || hemisphere === '') return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return null;
  const deg = Math.floor(v / 100);
  const min = v - deg * 100;
  if (min >= 60) return null;
  let result = deg + min / 60;
  if (isLat) {
    if (hemisphere === 'S') result = -result;
    else if (hemisphere !== 'N') return null;
    if (Math.abs(result) > 90) return null;
  } else {
    if (hemisphere === 'W') result = -result;
    else if (hemisphere !== 'E') return null;
    if (Math.abs(result) > 180) return null;
  }
  return result;
}

/** hhmmss(.ss) → その日の経過秒。不正なら null */
function parseNmeaTime(raw: string): number | null {
  if (!/^\d{6}(\.\d+)?$/.test(raw)) return null;
  const h = Number(raw.substring(0, 2));
  const m = Number(raw.substring(2, 4));
  const s = Number(raw.substring(4));
  if (h > 23 || m > 59 || s >= 61) return null; // 60秒台はうるう秒許容
  return h * 3600 + m * 60 + s;
}

/**
 * NMEA RMC テキストをパースして TelemetrySession を返す。
 *
 * 防御的検証:
 * - RMC センテンスが1行も無い → throw（理由つき）
 * - チェックサム不一致・ステータス V（無効測位）・フィールド不正は
 *   センテンス単位でスキップ（件数を meta.extra に記録）
 * - 有効点が2点未満 → throw
 *
 * @param text ファイル内容（テキスト）
 * @throws TelemetryParseError NMEA RMC として解釈できない場合
 */
export function parseNmeaRmc(text: string): TelemetrySession {
  if (text.trim().length === 0) {
    throw new TelemetryParseError(FORMAT_LABEL, '空のファイルです');
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const points: TelemetryPoint[] = [];
  let rmcLines = 0;
  let checksumErrors = 0;
  let invalidFixes = 0;
  let malformed = 0;

  let firstTimeOfDay: number | null = null;
  let prevAdjusted: number | null = null;
  let dayOffset = 0;
  let startTimestamp: Date | undefined;

  for (const line of lines) {
    if (!line.startsWith('$GPRMC') && !line.startsWith('$GNRMC')) continue;
    rmcLines++;

    // チェックサム検証（$ と * の間の XOR）
    const asterisk = line.indexOf('*');
    if (asterisk < 0 || asterisk + 3 > line.length) {
      checksumErrors++;
      continue;
    }
    const payload = line.substring(1, asterisk);
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) checksum ^= payload.charCodeAt(i);
    const expected = Number.parseInt(line.substring(asterisk + 1, asterisk + 3), 16);
    if (!Number.isFinite(expected) || checksum !== expected) {
      checksumErrors++;
      continue;
    }

    // fields[1]=時刻 fields[2]=ステータス fields[3,4]=緯度 fields[5,6]=経度
    // fields[7]=速度(ノット) fields[8]=針路 fields[9]=日付(ddmmyy)
    const fields = payload.split(',');
    if (fields.length < 10) {
      malformed++;
      continue;
    }
    if (fields[2] !== 'A') {
      invalidFixes++;
      continue; // 無効測位はスキップ
    }

    const timeOfDay = parseNmeaTime(fields[1]);
    const lat = parseNmeaCoord(fields[3], fields[4], true);
    const lon = parseNmeaCoord(fields[5], fields[6], false);
    const speedKnots = Number(fields[7]);

    if (timeOfDay === null || lat === null || lon === null || !Number.isFinite(speedKnots) || fields[7] === '') {
      malformed++;
      continue;
    }

    if (firstTimeOfDay === null) firstTimeOfDay = timeOfDay;
    // 日跨ぎ: 直前の経過秒より巻き戻ったら 24h 加算（深夜0時を跨いだ）
    let adjusted = timeOfDay - firstTimeOfDay + dayOffset;
    if (prevAdjusted !== null && adjusted < prevAdjusted) {
      dayOffset += 86400;
      adjusted += 86400;
    }
    // 同時刻の重複センテンスはスキップ
    if (prevAdjusted !== null && adjusted <= prevAdjusted) {
      malformed++;
      continue;
    }
    prevAdjusted = adjusted;

    // 針路（空フィールド = 停止中などで未確定 → null。0 への変換は禁止）
    const headingRaw = fields[8];
    const heading = headingRaw !== '' && Number.isFinite(Number(headingRaw)) ? Number(headingRaw) : null;

    // 開始実時刻: 最初の有効センテンスの日付+時刻を UTC として解釈
    // （NMEA 標準は UTC。DigiSpice は JST を書き込むため9時間ずれる可能性あり）
    if (startTimestamp === undefined && /^\d{6}$/.test(fields[9])) {
      const dd = Number(fields[9].substring(0, 2));
      const mm = Number(fields[9].substring(2, 4));
      const yy = Number(fields[9].substring(4, 6));
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        const ms = Date.UTC(2000 + yy, mm - 1, dd) + timeOfDay * 1000;
        startTimestamp = new Date(ms);
      }
    }

    points.push({
      time: adjusted,
      lat,
      lon,
      speed: speedKnots * 1.852, // ノット → km/h
      heading,
      altitude: null, // RMC センテンスに高度は含まれない
    });
  }

  if (rmcLines === 0) {
    throw new TelemetryParseError(FORMAT_LABEL, '$GPRMC / $GNRMC センテンスが見つかりません');
  }
  if (points.length < 2) {
    throw new TelemetryParseError(
      FORMAT_LABEL,
      `有効な測位が2点未満です（RMC ${rmcLines}行中: チェックサム不一致 ${checksumErrors}, 無効測位 ${invalidFixes}, 形式不正 ${malformed}）`,
    );
  }

  const extra: Record<string, string> = {
    Sentences: String(rmcLines),
    ValidPoints: String(points.length),
  };
  if (checksumErrors > 0) extra.ChecksumErrors = String(checksumErrors);
  if (invalidFixes > 0) extra.InvalidFixes = String(invalidFixes);
  if (malformed > 0) extra.MalformedSentences = String(malformed);

  return {
    points,
    meta: {
      format: 'nmea',
      sampleRateHz: estimateSampleRateHz(points.map((p) => p.time)),
      startTimestamp,
      source: 'NMEA 0183 RMC',
      extra,
    },
  };
}
