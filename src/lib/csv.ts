// CSVエクスポート — CarSetup[] を UTF-8 BOM 付き CSV 文字列へ変換する。
//
// 原則:
// - null / undefined は空セル（0 や偽値に変換しない＝偽データ混入防止）
// - Excel 日本語対応のため UTF-8 BOM を先頭に付与
// - 値内のダブルクォート・カンマ・改行は RFC 4180 に従いエスケープ
//
// 依存パッケージは追加しない（手書き生成）。

import { CarSetup } from '../types/setup';
import { UNITS } from './units';
import { legacyWeatherLabel } from './weather';

/**
 * 1セルをCSV用にエスケープする。
 * - null/undefined は空文字
 * - ダブルクォート・カンマ・改行・CR を含む場合はダブルクォートで囲み、内部の " を "" にする
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s === '') return '';
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** セッション種別の日本語ラベル */
function sessionTypeLabel(type: CarSetup['sessionType']): string {
  switch (type) {
    case 'practice':
      return '練習走行';
    case 'qualifying':
      return '予選';
    case 'race':
      return 'レース';
    default:
      return '';
  }
}

/** Date を「YYYY-MM-DD HH:mm」のローカル表記へ。無効値は空文字 */
function formatDateTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 数値 Maybe をセル値へ。null/undefined はそのまま（escapeで空セル化される） */
function num(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

// 列定義: ヘッダーラベルと、CarSetup から値を取り出す関数のペア。
// 単位はヘッダーに併記する（CLAUDE.md / 要件: 単位ラベル必須）。
type Column = {
  header: string;
  get: (s: CarSetup) => string | number | null | undefined;
};

const COLUMNS: Column[] = [
  { header: '日付', get: (s) => formatDateTime(s.date) },
  { header: 'サーキット', get: (s) => s.circuit },
  { header: '車種', get: (s) => s.carModel },
  { header: 'ドライバー', get: (s) => s.driver ?? null },
  { header: 'セッション種別', get: (s) => sessionTypeLabel(s.sessionType) },
  { header: '天候', get: (s) => legacyWeatherLabel(s.weather.condition) },
  { header: `気温(${UNITS.temperature})`, get: (s) => num(s.weather.airTemp) },
  { header: `路温(${UNITS.temperature})`, get: (s) => num(s.weather.trackTemp) },
  { header: `湿度(${UNITS.humidity})`, get: (s) => num(s.weather.humidity) },
  { header: `気圧(${UNITS.atmosphericPressure})`, get: (s) => num(s.weather.pressure) },

  // タイヤ空気圧 4輪 before/after (kPa)
  { header: `FL空気圧前(${UNITS.pressure})`, get: (s) => num(s.tireSettings.fl.before) },
  { header: `FL空気圧後(${UNITS.pressure})`, get: (s) => num(s.tireSettings.fl.after) },
  { header: `FR空気圧前(${UNITS.pressure})`, get: (s) => num(s.tireSettings.fr.before) },
  { header: `FR空気圧後(${UNITS.pressure})`, get: (s) => num(s.tireSettings.fr.after) },
  { header: `RL空気圧前(${UNITS.pressure})`, get: (s) => num(s.tireSettings.rl.before) },
  { header: `RL空気圧後(${UNITS.pressure})`, get: (s) => num(s.tireSettings.rl.after) },
  { header: `RR空気圧前(${UNITS.pressure})`, get: (s) => num(s.tireSettings.rr.before) },
  { header: `RR空気圧後(${UNITS.pressure})`, get: (s) => num(s.tireSettings.rr.after) },

  { header: 'タイヤセットID', get: (s) => s.tireInfo.tireSetCode || null },
  { header: 'タイヤメーカー', get: (s) => s.tireInfo.manufacturer || s.tireInfo.brand || null },
  { header: 'タイヤ製品名', get: (s) => s.tireInfo.productName || null },
  { header: 'コンパウンド', get: (s) => s.tireInfo.compound || null },

  { header: 'ベストラップ', get: (s) => s.lapTimeData?.bestLap ?? null },
  { header: '周回数', get: (s) => num(s.lapTimeData?.totalLaps) },

  // サスペンション全項目
  { header: `Fダンパー圧側(${UNITS.damper})`, get: (s) => num(s.suspensionSettings?.frontDamper.compression) },
  { header: `Fダンパー伸側(${UNITS.damper})`, get: (s) => num(s.suspensionSettings?.frontDamper.rebound) },
  { header: `Rダンパー圧側(${UNITS.damper})`, get: (s) => num(s.suspensionSettings?.rearDamper.compression) },
  { header: `Rダンパー伸側(${UNITS.damper})`, get: (s) => num(s.suspensionSettings?.rearDamper.rebound) },
  { header: `Fバネレート(${UNITS.springRate})`, get: (s) => num(s.suspensionSettings?.springRate.front) },
  { header: `Rバネレート(${UNITS.springRate})`, get: (s) => num(s.suspensionSettings?.springRate.rear) },
  { header: `F車高(${UNITS.rideHeight})`, get: (s) => num(s.suspensionSettings?.rideHeight.front) },
  { header: `R車高(${UNITS.rideHeight})`, get: (s) => num(s.suspensionSettings?.rideHeight.rear) },
  { header: 'Fスタビライザー', get: (s) => num(s.suspensionSettings?.antiRollBar.front) },
  { header: 'Rスタビライザー', get: (s) => num(s.suspensionSettings?.antiRollBar.rear) },

  // アライメント全項目
  { header: `Fキャンバー(${UNITS.angle})`, get: (s) => num(s.alignmentSettings?.camber.front) },
  { header: `Rキャンバー(${UNITS.angle})`, get: (s) => num(s.alignmentSettings?.camber.rear) },
  { header: `Fトー(${UNITS.rideHeight})`, get: (s) => num(s.alignmentSettings?.toe.front) },
  { header: `Rトー(${UNITS.rideHeight})`, get: (s) => num(s.alignmentSettings?.toe.rear) },
  { header: `キャスター(${UNITS.angle})`, get: (s) => num(s.alignmentSettings?.caster) },

  { header: 'メモ', get: (s) => s.notes || null },
];

/**
 * CarSetup[] を CSV 文字列に変換する（UTF-8 BOM 付き）。
 * null/未入力は空セルとして出力し、0 等の偽値に変換しない。
 */
export function setupsToCsv(setups: CarSetup[]): string {
  const BOM = '﻿';
  const headerRow = COLUMNS.map((c) => escapeCsvCell(c.header)).join(',');
  const rows = setups.map((s) => COLUMNS.map((c) => escapeCsvCell(c.get(s))).join(','));
  // CRLF 区切り（Excel 互換）
  return BOM + [headerRow, ...rows].join('\r\n');
}

/** エクスポート用ファイル名: velocity-logger-export-YYYYMMDD.csv */
export function csvFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return `velocity-logger-export-${ymd}.csv`;
}

/**
 * ブラウザでCSV文字列をダウンロードさせる。
 * テスト環境（document 不在）では何もしない。
 */
export function downloadCsv(csv: string, fileName: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
