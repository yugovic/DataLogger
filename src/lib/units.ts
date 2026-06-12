// 単位定数 — UIラベルに必ず併記すること
export const UNITS = {
  pressure: 'kPa',       // タイヤ空気圧
  rideHeight: 'mm',      // 車高
  springRate: 'kgf/mm',  // バネレート
  angle: 'deg',          // アライメント角度 (キャンバー/トー/キャスター)
  temperature: '℃',      // 気温・路面温度
  humidity: '%',         // 湿度
  atmosphericPressure: 'hPa', // 気圧
  distance: 'km',        // 走行距離
  fuel: 'L',             // 燃料量
  damper: 'click',       // ダンパー段数
} as const;

/**
 * 文字列を数値に変換する。
 * - 空文字・undefined・NaN は null を返す
 * - '0' は正当な 0 として保存する（0→null の変換禁止）
 */
export function toNumberOrNull(s: string | null | undefined): number | null {
  if (s === null || s === undefined || s.trim() === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * 整数文字列を数値に変換する。
 * - 空文字・undefined・NaN は null を返す
 * - '0' は正当な 0 として保存する
 */
export function toIntOrNull(s: string | null | undefined): number | null {
  if (s === null || s === undefined || s.trim() === '') return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/**
 * タイヤ空気圧の差分を計算する導出値。
 * before/after どちらかが null なら null を返す。
 */
export function calcPressureDiff(before: number | null, after: number | null): number | null {
  if (before === null || after === null) return null;
  return after - before;
}
