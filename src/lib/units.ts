// 単位定数 — UIラベルに必ず併記すること
export const UNITS = {
  pressure: 'kPa',       // タイヤ空気圧・ブースト圧
  rideHeight: 'mm',      // 車高・スプリッター高さ
  springRate: 'kgf/mm',  // バネレート
  angle: 'deg',          // アライメント角度 (キャンバー/トー/キャスター)・ウイング角度
  temperature: '℃',      // 気温・路面温度
  humidity: '%',         // 湿度・ラジエター開度・冷却系開度
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

// ─── 単位設定（ユーザー表示単位） ────────────────────────────────
//
// Firestore保存値・既存データは常に正規単位（kPa・℃）のまま。
// 変換は「表示」と「入力の境界」でのみ行う（丸め誤差でデータを劣化させない）。

export type PressureUnit = 'kPa' | 'psi';
export type TemperatureUnit = 'C' | 'F';

export interface UnitPreferences {
  pressure: PressureUnit;
  temperature: TemperatureUnit;
}

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  pressure: 'kPa',
  temperature: 'C',
};

/** 1 psi = 6.894757 kPa */
const KPA_PER_PSI = 6.894757;

export function kpaToPsi(kpa: number): number {
  return kpa / KPA_PER_PSI;
}

export function psiToKpa(psi: number): number {
  return psi * KPA_PER_PSI;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/**
 * 正規値（kPa）→ 選択中の表示単位の数値に変換する。
 * null は null のまま（0 を null に変換しない・null を 0 に変換しない）。
 */
export function pressureToDisplay(kpa: number | null, unit: PressureUnit): number | null {
  if (kpa === null) return null;
  return unit === 'psi' ? kpaToPsi(kpa) : kpa;
}

/**
 * 表示単位の入力値 → 正規値（kPa）に変換する。保存直前に呼ぶ。
 */
export function pressureToNormalized(value: number | null, unit: PressureUnit): number | null {
  if (value === null) return null;
  return unit === 'psi' ? psiToKpa(value) : value;
}

/** 正規値（℃）→ 選択中の表示単位の数値に変換する。 */
export function temperatureToDisplay(celsius: number | null, unit: TemperatureUnit): number | null {
  if (celsius === null) return null;
  return unit === 'F' ? celsiusToFahrenheit(celsius) : celsius;
}

/** 表示単位の入力値 → 正規値（℃）に変換する。保存直前に呼ぶ。 */
export function temperatureToNormalized(value: number | null, unit: TemperatureUnit): number | null {
  if (value === null) return null;
  return unit === 'F' ? fahrenheitToCelsius(value) : value;
}

/** ラベル用の単位文字列 */
export function pressureUnitLabel(unit: PressureUnit): string {
  return unit === 'psi' ? 'psi' : 'kPa';
}

export function temperatureUnitLabel(unit: TemperatureUnit): string {
  return unit === 'F' ? '°F' : '℃';
}

/**
 * 正規値（kPa）→ 表示文字列（丸め小数1桁 + 単位ラベル）。null は「—」。
 */
export function formatPressure(kpa: number | null, unit: PressureUnit): string {
  const v = pressureToDisplay(kpa, unit);
  if (v === null) return '—';
  return `${v.toFixed(1)} ${pressureUnitLabel(unit)}`;
}

/**
 * 正規値（℃）→ 表示文字列（丸め小数1桁 + 単位ラベル）。null は「—」。
 */
export function formatTemperature(celsius: number | null, unit: TemperatureUnit): string {
  const v = temperatureToDisplay(celsius, unit);
  if (v === null) return '—';
  return `${v.toFixed(1)} ${temperatureUnitLabel(unit)}`;
}
