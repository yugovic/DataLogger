// CSVエクスポート — CarSetup[] を UTF-8 BOM 付き CSV 文字列へ変換する。
//
// 原則:
// - null / undefined は空セル（0 や偽値に変換しない＝偽データ混入防止）
// - Excel 日本語対応のため UTF-8 BOM を先頭に付与
// - 値内のダブルクォート・カンマ・改行は RFC 4180 に従いエスケープ
//
// 依存パッケージは追加しない（手書き生成）。
//
// 多言語対応:
// - ヘッダー行・セッション種別・天候などの「ラベル」は選択ロケールに応じて出し分ける
//   （t 関数と locale を受け取る。既存の compare.fields / common 名前空間の翻訳を再利用）
// - ユーザー入力値（サーキット名・メモ等の実データ）は翻訳しない
// - 数値・日付フォーマットは formatters（Intl）でロケールに従う

import type { TFunction } from 'i18next';
import { CarSetup } from '../types/setup';
import { UNITS } from './units';
import { weatherTranslationKey } from './weather';
import { formatDateTime as formatLocaleDateTime, formatNumber } from '../i18n/formatters';
import type { SupportedLocale } from '../i18n/locale';

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

/** セッション種別ラベルを選択ロケールで返す（common.sessionType.* を再利用） */
function sessionTypeLabel(type: CarSetup['sessionType'], t: TFunction): string {
  if (!type) return '';
  return t(`common.sessionType.${type}`);
}

/** 天候ラベルを選択ロケールで返す（common.weather.* を再利用）。未設定は空文字 */
function weatherLabel(
  condition: CarSetup['weather']['condition'],
  t: TFunction,
): string {
  const key = weatherTranslationKey(condition);
  return key ? t(`common.${key}`) : '';
}

/** Date を選択ロケールの日時表記へ。無効値は空文字 */
function formatCsvDateTime(date: Date, locale: SupportedLocale): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatLocaleDateTime(d, locale);
}

/** 数値 Maybe をセル値へ。null/undefined はそのまま（escapeで空セル化される） */
function num(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

// 列定義: ヘッダーラベルと、CarSetup から値を取り出す関数のペア。
// 単位はヘッダーに併記する（CLAUDE.md / 要件: 単位ラベル必須）。
// header はロケール確定後に構築するため、buildColumns(t, locale) で生成する。
type Column = {
  header: string;
  get: (s: CarSetup) => string | number | null | undefined;
};

/** ラベルに単位を併記する: 「気温」+「℃」→「気温(℃)」 */
const withUnit = (label: string, unit: string): string => `${label}(${unit})`;

/**
 * 選択ロケールに応じた列定義を生成する。
 * ヘッダーは既存の compare.fields.* 翻訳を再利用し、CSV 固有の日付・メモのみ history.csv.headers に追加。
 */
function buildColumns(t: TFunction, locale: SupportedLocale): Column[] {
  const f = (key: string) => t(`compare.fields.${key}`);
  return [
    { header: t('history.csv.headers.date'), get: (s) => formatCsvDateTime(s.date, locale) },
    { header: f('circuit'), get: (s) => s.circuit },
    { header: f('carModel'), get: (s) => s.carModel },
    { header: f('driver'), get: (s) => s.driver ?? null },
    { header: f('sessionType'), get: (s) => sessionTypeLabel(s.sessionType, t) },
    { header: f('weather'), get: (s) => weatherLabel(s.weather.condition, t) },
    { header: withUnit(f('airTemp'), UNITS.temperature), get: (s) => num(s.weather.airTemp) },
    { header: withUnit(f('trackTemp'), UNITS.temperature), get: (s) => num(s.weather.trackTemp) },
    { header: withUnit(f('humidity'), UNITS.humidity), get: (s) => num(s.weather.humidity) },
    { header: withUnit(f('pressure'), UNITS.atmosphericPressure), get: (s) => num(s.weather.pressure) },

    // タイヤ空気圧 4輪 before/after (kPa)
    { header: withUnit(f('flBefore'), UNITS.pressure), get: (s) => num(s.tireSettings.fl.before) },
    { header: withUnit(f('flAfter'), UNITS.pressure), get: (s) => num(s.tireSettings.fl.after) },
    { header: withUnit(f('frBefore'), UNITS.pressure), get: (s) => num(s.tireSettings.fr.before) },
    { header: withUnit(f('frAfter'), UNITS.pressure), get: (s) => num(s.tireSettings.fr.after) },
    { header: withUnit(f('rlBefore'), UNITS.pressure), get: (s) => num(s.tireSettings.rl.before) },
    { header: withUnit(f('rlAfter'), UNITS.pressure), get: (s) => num(s.tireSettings.rl.after) },
    { header: withUnit(f('rrBefore'), UNITS.pressure), get: (s) => num(s.tireSettings.rr.before) },
    { header: withUnit(f('rrAfter'), UNITS.pressure), get: (s) => num(s.tireSettings.rr.after) },

    { header: f('tireSetId'), get: (s) => s.tireInfo.tireSetCode || null },
    { header: f('manufacturer'), get: (s) => s.tireInfo.manufacturer || s.tireInfo.brand || null },
    { header: f('productName'), get: (s) => s.tireInfo.productName || null },
    { header: f('compound'), get: (s) => s.tireInfo.compound || null },

    { header: f('bestLap'), get: (s) => s.lapTimeData?.bestLap ?? null },
    { header: f('totalLaps'), get: (s) => num(s.lapTimeData?.totalLaps) },

    // サスペンション全項目
    { header: withUnit(f('frontDamperCompression'), UNITS.damper), get: (s) => num(s.suspensionSettings?.frontDamper.compression) },
    { header: withUnit(f('frontDamperRebound'), UNITS.damper), get: (s) => num(s.suspensionSettings?.frontDamper.rebound) },
    { header: withUnit(f('rearDamperCompression'), UNITS.damper), get: (s) => num(s.suspensionSettings?.rearDamper.compression) },
    { header: withUnit(f('rearDamperRebound'), UNITS.damper), get: (s) => num(s.suspensionSettings?.rearDamper.rebound) },
    { header: withUnit(f('frontSpringRate'), UNITS.springRate), get: (s) => num(s.suspensionSettings?.springRate.front) },
    { header: withUnit(f('rearSpringRate'), UNITS.springRate), get: (s) => num(s.suspensionSettings?.springRate.rear) },
    { header: withUnit(f('frontRideHeight'), UNITS.rideHeight), get: (s) => num(s.suspensionSettings?.rideHeight.front) },
    { header: withUnit(f('rearRideHeight'), UNITS.rideHeight), get: (s) => num(s.suspensionSettings?.rideHeight.rear) },
    { header: f('frontAntiRollBar'), get: (s) => num(s.suspensionSettings?.antiRollBar.front) },
    { header: f('rearAntiRollBar'), get: (s) => num(s.suspensionSettings?.antiRollBar.rear) },

    // アライメント全項目
    { header: withUnit(f('frontCamber'), UNITS.angle), get: (s) => num(s.alignmentSettings?.camber.front) },
    { header: withUnit(f('rearCamber'), UNITS.angle), get: (s) => num(s.alignmentSettings?.camber.rear) },
    { header: withUnit(f('frontToe'), UNITS.rideHeight), get: (s) => num(s.alignmentSettings?.toe.front) },
    { header: withUnit(f('rearToe'), UNITS.rideHeight), get: (s) => num(s.alignmentSettings?.toe.rear) },
    { header: withUnit(f('caster'), UNITS.angle), get: (s) => num(s.alignmentSettings?.caster) },

    { header: t('history.csv.headers.notes'), get: (s) => s.notes || null },
  ];
}

/**
 * CarSetup[] を CSV 文字列に変換する（UTF-8 BOM 付き）。
 * - ヘッダー・セッション種別・天候ラベルは t（選択ロケール）で出し分ける
 * - 数値はロケールの数値フォーマット（桁区切りなし＝CSV 解析安全）を適用
 * - null/未入力は空セルとして出力し、0 等の偽値に変換しない
 */
export function setupsToCsv(setups: CarSetup[], t: TFunction, locale: SupportedLocale): string {
  const BOM = '﻿';
  const columns = buildColumns(t, locale);
  const formatCell = (value: string | number | null | undefined): string => {
    // 数値はロケールの小数点表記に従う。桁区切りは CSV 破損防止のため無効化。
    if (typeof value === 'number') return formatNumber(value, locale, { useGrouping: false });
    return escapeCsvCell(value);
  };
  const headerRow = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const rows = setups.map((s) => columns.map((c) => formatCell(c.get(s))).join(','));
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
