// AIM CSV パーサー（Race Studio 2/3 の CSV エクスポート）
//
// 想定構造:
//   "Format","AIM CSV File"          ← メタデータ行（"キー","値"）が0行以上
//   "Venue","Tsukuba Circuit"
//   ...
//   "Time","GPS_Speed","GPS_Latitude",...   ← チャネル名行（4列以上）
//   "s","km/h","deg",...                    ← 単位行（欠落エクスポートにも防御）
//   0.00,87.2,36.110600,...                 ← データ行
//
// 列名ゆらぎ対応（プロトタイプ準拠）:
//   時刻:  "Time"（大文字小文字無視・完全一致）
//   速度:  /gps.?speed/i または "Speed" かつ単位 km/h
//   緯度:  /gps.?lat/i または "Latitude"
//   経度:  /gps.?lon/i または "Longitude"
//   方位:  /gps.?heading/i または "Heading"

import { estimateSampleRateHz } from './derive';
import { haversineMeters } from './geo';
import { TelemetryParseError, type TelemetryPoint, type TelemetrySession } from './types';

const FORMAT_LABEL = 'AIM CSV';

/** AIM メタデータとして認識するキー */
const META_KEYS = ['Format', 'Venue', 'Date', 'Time', 'Sample Rate', 'Segment', 'Vehicle', 'Racer', 'Championship', 'Session'];

/** CSV 1行をセル配列に分解（クォート除去・トリム） */
function splitCsvLine(line: string): string[] {
  return line.split(',').map((s) => s.replace(/"/g, '').trim());
}

/** セルが数値として読めるか */
function isNumericCell(s: string): boolean {
  return s !== '' && Number.isFinite(Number(s));
}

/** "2026/06/03" + "10:30:00" 形式の Date/Time メタを JST として UTC Date に変換 */
function parseJstDateTime(dateStr: string | undefined, timeStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const dm = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!dm) return undefined;
  let h = 0;
  let mi = 0;
  let se = 0;
  if (timeStr) {
    const tm = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (tm) {
      h = Number(tm[1]);
      mi = Number(tm[2]);
      se = tm[3] !== undefined ? Number(tm[3]) : 0;
    }
  }
  // AIM のエクスポートはロガー設定のローカル時刻（国内利用前提で JST と解釈）
  const ms = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), h, mi, se) - 9 * 3600 * 1000;
  return new Date(ms);
}

/**
 * AIM CSV テキストをパースして TelemetrySession を返す。
 *
 * 防御的検証:
 * - 空ファイル / チャネル名行が見つからない / Time 列が無い → throw
 * - 速度列が無い場合は GPS 座標から速度を導出（GPS も無ければ throw）
 * - 単位行が欠落したエクスポート（チャネル名行の直後が数値行）にも対応
 * - 列数不足・時刻が数値でない行はスキップ
 *
 * @param text ファイル内容（テキスト）
 * @throws TelemetryParseError AIM CSV として解釈できない場合
 */
export function parseAimCsv(text: string): TelemetrySession {
  if (text.trim().length === 0) {
    throw new TelemetryParseError(FORMAT_LABEL, '空のファイルです');
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // --- メタデータ行とチャネル名行の探索 ---
  const extra: Record<string, string> = {};
  let headerIdx = -1;

  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i];
    const cells = splitCsvLine(line);
    // チャネル名行: 4列以上で、先頭セルが数値でない（データ行と区別）
    if (cells.length >= 4 && !isNumericCell(cells[0])) {
      headerIdx = i;
      break;
    }
    // メタデータ行: "キー","値"（値は省略可）
    const metaMatch = line.match(/^"([\w][\w\s]*)"\s*,\s*"?([^"]*)"?$/);
    if (metaMatch && META_KEYS.includes(metaMatch[1].trim())) {
      extra[metaMatch[1].trim()] = metaMatch[2].trim();
    }
  }

  if (headerIdx < 0) {
    throw new TelemetryParseError(FORMAT_LABEL, 'チャネル名行（4列以上のヘッダ）が見つかりません');
  }

  const channels = splitCsvLine(lines[headerIdx]);

  // --- 単位行（欠落していれば空配列として扱い、データ開始位置を繰り上げ） ---
  let units: string[] = [];
  let dataIdx = headerIdx + 1;
  if (dataIdx < lines.length) {
    const cells = splitCsvLine(lines[dataIdx]);
    if (!isNumericCell(cells[0])) {
      units = cells;
      dataIdx++;
    }
  }

  // --- 列インデックスの解決（列名ゆらぎ対応） ---
  const lower = channels.map((c) => c.toLowerCase());
  const timeIdx = lower.findIndex((c) => c === 'time');
  const speedIdx = channels.findIndex(
    (c, i) => /gps.?speed/i.test(c) || (c.toLowerCase() === 'speed' && (units[i] ?? '') === 'km/h'),
  );
  const latIdx = channels.findIndex((c) => /gps.?lat/i.test(c) || c.toLowerCase() === 'latitude');
  const lonIdx = channels.findIndex((c) => /gps.?lon/i.test(c) || c.toLowerCase() === 'longitude');
  const headingIdx = channels.findIndex((c) => /gps.?heading/i.test(c) || c.toLowerCase() === 'heading');

  if (timeIdx < 0) {
    throw new TelemetryParseError(FORMAT_LABEL, `Time 列が見つかりません（検出した列: ${channels.join(', ')}）`);
  }
  const hasGps = latIdx >= 0 && lonIdx >= 0;
  if (speedIdx < 0 && !hasGps) {
    throw new TelemetryParseError(FORMAT_LABEL, '速度列も GPS 座標列も無いため走行データとして利用できません');
  }

  // --- データ行のパース ---
  interface RawRow {
    time: number;
    speed: number | null;
    lat: number | null;
    lon: number | null;
    heading: number | null;
  }
  const rows: RawRow[] = [];
  let prevTime = Number.NEGATIVE_INFINITY;

  for (let i = dataIdx; i < lines.length; i++) {
    const vals = splitCsvLine(lines[i]);
    if (vals.length < channels.length) continue;

    const time = Number(vals[timeIdx]);
    if (!Number.isFinite(time) || time <= prevTime) continue;

    const numAt = (idx: number): number | null => {
      if (idx < 0 || idx >= vals.length) return null;
      const v = Number(vals[idx]);
      return vals[idx] !== '' && Number.isFinite(v) ? v : null;
    };

    const lat = numAt(latIdx);
    const lon = numAt(lonIdx);
    rows.push({
      time,
      speed: numAt(speedIdx),
      lat: lat !== null && Math.abs(lat) <= 90 ? lat : null,
      lon: lon !== null && Math.abs(lon) <= 180 ? lon : null,
      heading: numAt(headingIdx),
    });
    prevTime = time;
  }

  if (rows.length < 2) {
    throw new TelemetryParseError(FORMAT_LABEL, `有効なデータ行が2行未満です（${rows.length} 行）`);
  }

  // --- 速度の決定: 速度列があれば採用、無ければ GPS から導出 ---
  // 速度列があるのにセルが欠損した行は前後の文脈が無いためスキップする
  // （0 で充填する偽データ化は禁止）
  const points: TelemetryPoint[] = [];
  const t0 = rows[0].time;

  if (speedIdx >= 0) {
    for (const r of rows) {
      if (r.speed === null) continue;
      points.push({ time: r.time - t0, lat: r.lat, lon: r.lon, speed: r.speed, heading: r.heading, altitude: null });
    }
  } else {
    // GPS 由来の導出速度: 直前点との Haversine 距離 / 経過時間
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let speed: number | null = null;
      if (i > 0) {
        const p = rows[i - 1];
        const dt = r.time - p.time;
        if (dt > 0 && p.lat !== null && p.lon !== null && r.lat !== null && r.lon !== null) {
          speed = (haversineMeters({ lat: p.lat, lon: p.lon }, { lat: r.lat, lon: r.lon }) / dt) * 3.6;
        }
      }
      if (speed === null) continue;
      points.push({ time: r.time - t0, lat: r.lat, lon: r.lon, speed, heading: r.heading, altitude: null });
    }
  }

  if (points.length < 2) {
    throw new TelemetryParseError(FORMAT_LABEL, '速度を決定できる行が2行未満です（速度列欠損または GPS 欠損）');
  }

  // --- メタ情報 ---
  let sampleRateHz: number | null = null;
  if (extra['Sample Rate'] !== undefined && isNumericCell(extra['Sample Rate'])) {
    sampleRateHz = Number(extra['Sample Rate']);
  } else {
    sampleRateHz = estimateSampleRateHz(points.map((p) => p.time));
  }

  extra.Channels = channels.join(', ');
  if (speedIdx < 0) extra.SpeedDerivedFromGps = 'true';

  return {
    points,
    meta: {
      format: 'aim-csv',
      sampleRateHz,
      startTimestamp: parseJstDateTime(extra.Date, extra.Time),
      source: 'AIM CSV (Race Studio export)',
      extra,
    },
  };
}
