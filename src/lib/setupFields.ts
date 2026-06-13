// セットアップの表示・比較・サマリー用の共通ヘルパー。
//
// 比較ビュー (SetupCompare)・履歴カード (SetupCard)・引き継ぎロジックで共有する。
// null は決して 0 や偽値に変換しない（事業要件: 偽データ混入ゼロ）。

import { CarSetup } from '../types/setup';
import { UNITS } from './units';

/** 値の表示用フォーマット。null/undefined は「—」 */
export function displayValue(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  return unit ? `${value} ${unit}` : String(value);
}

/** 差分の符号付き表示（+5 / -3）。0 は「±0」 */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return '±0';
}

/** セッション種別の日本語ラベル */
export function sessionTypeLabel(type: CarSetup['sessionType']): string {
  switch (type) {
    case 'practice':
      return '練習走行';
    case 'qualifying':
      return '予選';
    case 'race':
      return 'レース';
    default:
      return '—';
  }
}

/**
 * ラップタイム文字列を比較用ミリ秒へ変換する。
 * 形式: "M:SS.mmm" または "SS.mmm"。解析不能なら null。
 */
export function lapTimeToMs(lap: string | null | undefined): number | null {
  if (!lap) return null;
  const trimmed = lap.trim();
  // M:SS.mmm
  const withMin = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (withMin) {
    const min = parseInt(withMin[1], 10);
    const sec = parseInt(withMin[2], 10);
    const ms = withMin[3] ? parseInt(withMin[3].padEnd(3, '0'), 10) : 0;
    return (min * 60 + sec) * 1000 + ms;
  }
  // SS.mmm
  const secOnly = /^(\d+)(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (secOnly) {
    const sec = parseInt(secOnly[1], 10);
    const ms = secOnly[2] ? parseInt(secOnly[2].padEnd(3, '0'), 10) : 0;
    return sec * 1000 + ms;
  }
  return null;
}

/**
 * 2つのベストラップを比較する。
 * 戻り値: 'a' = a が速い / 'b' = b が速い / null = 比較不能 or 同値
 */
export function compareBestLaps(
  a: string | null | undefined,
  b: string | null | undefined,
): 'a' | 'b' | null {
  const aMs = lapTimeToMs(a);
  const bMs = lapTimeToMs(b);
  if (aMs === null || bMs === null) return null;
  if (aMs < bMs) return 'a';
  if (bMs < aMs) return 'b';
  return null;
}

/** 温間後（after）空気圧の範囲表示。例「215-218」。全 null なら「—」 */
export function pressureRange(setup: CarSetup, axle: 'front' | 'rear'): string {
  const keys = axle === 'front' ? (['fl', 'fr'] as const) : (['rl', 'rr'] as const);
  const values = keys
    .map((k) => setup.tireSettings[k].after)
    .filter((v): v is number => v != null);
  if (values.length === 0) return '—';
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? String(min) : `${min}-${max}`;
}

/** カード用サマリー: 前後の温間後空気圧範囲（例「F 215-218 / R 210-213」） */
export function pressureSummary(setup: CarSetup): string {
  return `F ${pressureRange(setup, 'front')} / R ${pressureRange(setup, 'rear')}`;
}

// ─── 比較ビュー用の項目定義 ────────────────────────────────

export interface CompareRow {
  label: string;
  unit?: string;
  /** 各セットアップから取り出す値（数値 or 文字列 or null） */
  get: (s: CarSetup) => number | string | null | undefined;
  /** true の場合、数値差分（+5 等）を表示する */
  numeric?: boolean;
}

export interface CompareSection {
  title: string;
  rows: CompareRow[];
}

/** 比較ビューに表示する全セクション定義（単位はラベル横に併記） */
export function buildCompareSections(): CompareSection[] {
  return [
    {
      title: 'セッション情報',
      rows: [
        { label: 'サーキット', get: (s) => s.circuit },
        { label: '車種', get: (s) => s.carModel },
        { label: 'ドライバー', get: (s) => s.driver ?? null },
        { label: 'セッション種別', get: (s) => sessionTypeLabel(s.sessionType) },
        { label: '走行距離', unit: UNITS.distance, numeric: true, get: (s) => s.sessionInfo.distance },
        { label: '燃料量', unit: UNITS.fuel, numeric: true, get: (s) => s.sessionInfo.fuel },
      ],
    },
    {
      title: '天候',
      rows: [
        { label: '天候', get: (s) => s.weather.condition ?? null },
        { label: '気温', unit: UNITS.temperature, numeric: true, get: (s) => s.weather.airTemp },
        { label: '路面温度', unit: UNITS.temperature, numeric: true, get: (s) => s.weather.trackTemp },
        { label: '湿度', unit: UNITS.humidity, numeric: true, get: (s) => s.weather.humidity },
        { label: '気圧', unit: UNITS.atmosphericPressure, numeric: true, get: (s) => s.weather.pressure },
      ],
    },
    {
      title: `タイヤ空気圧 走行前 (${UNITS.pressure})`,
      rows: [
        { label: 'FL 前', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fl.before },
        { label: 'FR 前', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fr.before },
        { label: 'RL 前', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rl.before },
        { label: 'RR 前', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rr.before },
      ],
    },
    {
      title: `タイヤ空気圧 走行後 (${UNITS.pressure})`,
      rows: [
        { label: 'FL 後', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fl.after },
        { label: 'FR 後', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fr.after },
        { label: 'RL 後', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rl.after },
        { label: 'RR 後', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rr.after },
      ],
    },
    {
      title: 'タイヤ',
      rows: [
        { label: '銘柄', get: (s) => s.tireInfo.brand || null },
        { label: 'コンパウンド', get: (s) => s.tireInfo.compound || null },
      ],
    },
    {
      title: 'サスペンション',
      rows: [
        { label: 'Fダンパー 圧側', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.frontDamper.compression ?? null },
        { label: 'Fダンパー 伸側', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.frontDamper.rebound ?? null },
        { label: 'Rダンパー 圧側', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.rearDamper.compression ?? null },
        { label: 'Rダンパー 伸側', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.rearDamper.rebound ?? null },
        { label: 'Fバネレート', unit: UNITS.springRate, numeric: true, get: (s) => s.suspensionSettings?.springRate.front ?? null },
        { label: 'Rバネレート', unit: UNITS.springRate, numeric: true, get: (s) => s.suspensionSettings?.springRate.rear ?? null },
        { label: 'F車高', unit: UNITS.rideHeight, numeric: true, get: (s) => s.suspensionSettings?.rideHeight.front ?? null },
        { label: 'R車高', unit: UNITS.rideHeight, numeric: true, get: (s) => s.suspensionSettings?.rideHeight.rear ?? null },
        { label: 'Fスタビライザー', numeric: true, get: (s) => s.suspensionSettings?.antiRollBar.front ?? null },
        { label: 'Rスタビライザー', numeric: true, get: (s) => s.suspensionSettings?.antiRollBar.rear ?? null },
      ],
    },
    {
      title: 'アライメント',
      rows: [
        { label: 'Fキャンバー', unit: UNITS.angle, numeric: true, get: (s) => s.alignmentSettings?.camber.front ?? null },
        { label: 'Rキャンバー', unit: UNITS.angle, numeric: true, get: (s) => s.alignmentSettings?.camber.rear ?? null },
        { label: 'Fトー', unit: UNITS.rideHeight, numeric: true, get: (s) => s.alignmentSettings?.toe.front ?? null },
        { label: 'Rトー', unit: UNITS.rideHeight, numeric: true, get: (s) => s.alignmentSettings?.toe.rear ?? null },
        { label: 'キャスター', unit: UNITS.angle, numeric: true, get: (s) => s.alignmentSettings?.caster ?? null },
      ],
    },
    {
      title: 'ラップタイム',
      rows: [
        { label: 'ベストラップ', get: (s) => s.lapTimeData?.bestLap ?? null },
        { label: '周回数', numeric: true, get: (s) => s.lapTimeData?.totalLaps ?? null },
      ],
    },
  ];
}

/** 比較行の差分種別 */
export type DiffKind =
  | 'same' // 両者同値
  | 'changed' // 両者値ありで異なる
  | 'only-a' // a のみ値あり
  | 'only-b' // b のみ値あり
  | 'both-null'; // 両者 null

export interface CompareCellResult {
  aDisplay: string;
  bDisplay: string;
  kind: DiffKind;
  /** numeric 行で両者値ありのときの b-a 差分（表示用） */
  delta: number | null;
}

/** 1行ぶんの比較結果を計算する */
export function compareRow(row: CompareRow, a: CarSetup, b: CarSetup): CompareCellResult {
  const aVal = row.get(a);
  const bVal = row.get(b);
  const aEmpty = aVal === null || aVal === undefined || aVal === '';
  const bEmpty = bVal === null || bVal === undefined || bVal === '';

  const aDisplay = displayValue(aVal, !aEmpty ? row.unit : undefined);
  const bDisplay = displayValue(bVal, !bEmpty ? row.unit : undefined);

  let kind: DiffKind;
  if (aEmpty && bEmpty) kind = 'both-null';
  else if (aEmpty) kind = 'only-b';
  else if (bEmpty) kind = 'only-a';
  else kind = aVal === bVal ? 'same' : 'changed';

  let delta: number | null = null;
  if (row.numeric && typeof aVal === 'number' && typeof bVal === 'number') {
    delta = bVal - aVal;
  }

  return { aDisplay, bDisplay, kind, delta };
}
