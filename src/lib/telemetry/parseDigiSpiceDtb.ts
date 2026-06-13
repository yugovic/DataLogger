// DigiSpice .dtb バイナリパーサー
//
// ============================================================================
// .dtb フォーマット仕様（実走行データのリバースエンジニアリングによる。
// 詳細な検証過程は README.md「.dtb フォーマット仕様」参照）
//
//   レコード長: 128 バイト固定 / リトルエンディアン / サンプルレート実測 5 Hz
//
//   offset  型           内容
//   ------  -----------  --------------------------------------------------
//   [0:8]   float64      タイムスタンプ（Excel 序数日付。JST の壁時計）
//   [8:16]  float64      セッション先頭からの経過日数（= 経過秒 / 86400）
//   [16:32] extended80   経過秒
//   [32:48] extended80   緯度（度）
//   [48:64] extended80   経度（度）
//   [64:80] extended80   高度（m）※
//   [80:96] extended80   速度（km/h）※
//   [96:112] extended80  逆方位（進行方位 + 180°）※
//   [112:128] extended80 累積走行距離（km）
//
//   ※ プロトタイプ（TelemetryParserTest.html）は [64:80]=速度 / [80:96]=方位 と
//     誤って割り当てていた。実データ検証で以下を確認し本実装で修正済み:
//       - [80:96] の時間積分 = GPS 座標の Haversine 累積距離（5781m で完全一致）
//       - [64:80] は積分が距離と一致せず（3688m）、値域 67.8–107.7 が鈴鹿の
//         標高プロファイル（高低差約40m）と一致 → 高度
//       - ([96:112] + 180°) と GPS 軌跡から計算した進行方位の差: 中央値 0.83°
//
//   extended80 = x86 80bit 拡張倍精度を 16 バイト境界に配置したもの:
//     bytes[0:8]  = 64bit 仮数（リトルエンディアン、bit63 が明示的整数ビット）
//     bytes[8:10] = 符号(1bit) + 指数(15bit, バイアス 16383)
//     bytes[10:16] = パディング（ゼロ）
//   JS の number(float64) へは仮数上位 53bit のみ反映される（相対誤差 ~1e-16、
//   本用途では無視できる）。
// ============================================================================

import { estimateSampleRateHz } from './derive';
import { normalizeHeading } from './geo';
import { TelemetryParseError, type TelemetryPoint, type TelemetrySession } from './types';

const FORMAT_LABEL = 'DigiSpice .dtb';
const RECORD_SIZE = 128;

/** Excel 序数日付の妥当レンジ（30000≈1982年 〜 100000≈2173年） */
const EXCEL_SERIAL_MIN = 30000;
const EXCEL_SERIAL_MAX = 100000;

/** Excel 序数日付の起点 1899-12-30 の UTC エポックミリ秒 */
const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

/** JST(UTC+9) オフセットミリ秒 — .dtb のタイムスタンプは JST 壁時計 */
const JST_OFFSET_MS = 9 * 3600 * 1000;

/** 2^63（仮数の明示的整数ビットの位置） */
const TWO_POW_63 = 9223372036854775808;

/**
 * x86 80bit 拡張倍精度（16バイト格納）を number として読む。
 * - ゼロ（指数0・仮数0）→ 0
 * - 非正規化数（指数0・仮数≠0）→ 値が 2^-16382 未満のため 0 として扱う
 * - 指数 0x7FFF → 仮数の小数部が 0 なら ±Infinity、それ以外は NaN
 */
export function readExtended80(view: DataView, offset: number): number {
  // DataView に getUint64 が無いため 32bit ×2 で仮数を合成する
  const lo = view.getUint32(offset, true);
  const hi = view.getUint32(offset + 4, true);
  const mantissa = lo + hi * 4294967296; // lo + hi * 2^32
  const signExp = view.getUint16(offset + 8, true);
  const sign = (signExp >> 15) & 1;
  const exponent = signExp & 0x7fff;

  if (exponent === 0) return 0; // ゼロおよび非正規化数（実質0）
  if (exponent === 0x7fff) {
    // 整数ビット（hi の最上位）を除いた小数部が非0なら NaN。
    // 浮動小数点合成後の mantissa では下位ビットが落ちるため整数演算で判定する
    const fractionNonZero = lo !== 0 || (hi & 0x7fffffff) !== 0;
    if (fractionNonZero) return Number.NaN;
    return sign ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }

  const trueExp = exponent - 16383;
  const value = (mantissa / TWO_POW_63) * Math.pow(2, trueExp);
  return sign ? -value : value;
}

/**
 * バッファ先頭が .dtb のマジック条件（Excel 序数日付レンジの float64）を
 * 満たすかを判定する。detectFormat からも利用する。
 */
export function looksLikeDtb(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < RECORD_SIZE * 2) return false;
  const view = new DataView(buffer);
  const first = view.getFloat64(0, true);
  const second = view.getFloat64(RECORD_SIZE, true);
  return (
    Number.isFinite(first) &&
    first >= EXCEL_SERIAL_MIN &&
    first <= EXCEL_SERIAL_MAX &&
    Number.isFinite(second) &&
    second >= first &&
    second - first < 1 // 連続レコードの時刻差は1日未満のはず
  );
}

/**
 * DigiSpice .dtb バイナリをパースして TelemetrySession を返す。
 *
 * 防御的検証:
 * - 2レコード（256バイト）未満 → throw
 * - 先頭の Excel 序数日付がレンジ外 → throw（.dtb ではないと判断）
 * - レコード単位の異常（座標レンジ外・非有限値・時間逆行）はスキップし、
 *   スキップ率が 20% を超えたら破損データとして throw
 * - 末尾の 128 バイト未満の端数は無視（extra に記録）
 *
 * @param buffer ファイル内容（ArrayBuffer）
 * @throws TelemetryParseError 構造が .dtb として不正な場合
 */
export function parseDigiSpiceDtb(buffer: ArrayBuffer): TelemetrySession {
  if (buffer.byteLength < RECORD_SIZE * 2) {
    throw new TelemetryParseError(
      FORMAT_LABEL,
      `ファイルが小さすぎます（${buffer.byteLength} バイト、最低 ${RECORD_SIZE * 2} バイト必要）`,
    );
  }

  const view = new DataView(buffer);
  const firstSerial = view.getFloat64(0, true);
  if (!Number.isFinite(firstSerial) || firstSerial < EXCEL_SERIAL_MIN || firstSerial > EXCEL_SERIAL_MAX) {
    throw new TelemetryParseError(
      FORMAT_LABEL,
      `先頭8バイトが Excel 序数日付ではありません（値: ${firstSerial}。.dtb 以外のファイルの可能性）`,
    );
  }

  const recordCount = Math.floor(buffer.byteLength / RECORD_SIZE);
  const truncatedBytes = buffer.byteLength - recordCount * RECORD_SIZE;

  const points: TelemetryPoint[] = [];
  let skipped = 0;
  let lastTime = Number.NEGATIVE_INFINITY;

  for (let r = 0; r < recordCount; r++) {
    const o = r * RECORD_SIZE;
    const elapsed = readExtended80(view, o + 16);
    const lat = readExtended80(view, o + 32);
    const lon = readExtended80(view, o + 48);
    const altitude = readExtended80(view, o + 64);
    const speed = readExtended80(view, o + 80);
    const reverseCourse = readExtended80(view, o + 96);

    // レコード単位の妥当性検証
    const valid =
      Number.isFinite(elapsed) &&
      elapsed >= 0 &&
      elapsed > lastTime &&
      Number.isFinite(lat) &&
      Math.abs(lat) <= 90 &&
      Number.isFinite(lon) &&
      Math.abs(lon) <= 180 &&
      Number.isFinite(speed) &&
      speed >= 0 &&
      speed < 600;

    if (!valid) {
      skipped++;
      continue;
    }
    lastTime = elapsed;

    points.push({
      time: elapsed,
      lat,
      lon,
      speed,
      // [96:112] は進行方位の逆向き（+180°）で記録されている（README 参照）
      heading: Number.isFinite(reverseCourse) ? normalizeHeading(reverseCourse + 180) : null,
      altitude: Number.isFinite(altitude) ? altitude : null,
    });
  }

  if (points.length < 2) {
    throw new TelemetryParseError(FORMAT_LABEL, '有効なレコードが2件未満です（破損データの可能性）');
  }
  if (skipped / recordCount > 0.2) {
    throw new TelemetryParseError(
      FORMAT_LABEL,
      `不正レコードが多すぎます（${skipped}/${recordCount} 件をスキップ。破損データの可能性）`,
    );
  }

  // time をセッション先頭 0 起点に正規化（per-lap ファイルは元々 0 起点）
  const t0 = points[0].time;
  if (t0 !== 0) {
    for (const p of points) p.time -= t0;
  }

  // Excel 序数日付（JST 壁時計）→ UTC 実時刻
  const startTimestamp = new Date(EXCEL_EPOCH_UTC_MS + firstSerial * 86400000 - JST_OFFSET_MS);

  const duration = points[points.length - 1].time;
  const sampleRateHz = estimateSampleRateHz(points.map((p) => p.time));

  const extra: Record<string, string> = {
    Records: String(points.length),
    Duration: `${duration.toFixed(2)} s`,
  };
  if (skipped > 0) extra.SkippedRecords = String(skipped);
  if (truncatedBytes > 0) extra.TruncatedBytes = String(truncatedBytes);

  return {
    points,
    meta: {
      format: 'digispice-dtb',
      sampleRateHz,
      startTimestamp,
      source: 'DigiSpice .dtb (binary)',
      extra,
    },
  };
}
