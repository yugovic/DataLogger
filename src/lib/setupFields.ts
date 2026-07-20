// セットアップの表示・比較・サマリー用の共通ヘルパー。
//
// 比較ビュー (SetupCompare)・履歴カード (SetupCard)・引き継ぎロジックで共有する。
// null は決して 0 や偽値に変換しない（事業要件: 偽データ混入ゼロ）。

import { CarSetup } from '../types/setup';
import { UNITS } from './units';
import { legacyWeatherLabel } from './weather';
import { weatherTranslationKey } from './weather';
import type { TFunction } from 'i18next';

/** 値の表示用フォーマット。null/undefined は「—」 */
export function displayValue(value: number | string | boolean | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  return unit ? `${value} ${unit}` : String(value);
}

/** 差分の符号付き表示（+5 / -3）。0 は「±0」 */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return '±0';
}

/** セッション種別の日本語ラベル */
export function sessionTypeTranslationKey(type: CarSetup['sessionType']): string {
  switch (type) {
    case 'practice':
      return 'common.sessionType.practice';
    case 'qualifying':
      return 'common.sessionType.qualifying';
    case 'race':
      return 'common.sessionType.race';
    default:
      return 'common.sessionType.unknown';
  }
}

/**
 * ラップタイム文字列を比較用ミリ秒へ変換する。
 * 形式: "M:SS.mmm" / "M'SS.mmm" / "SS.mmm"。解析不能なら null。
 */
export function lapTimeToMs(lap: string | null | undefined): number | null {
  if (!lap) return null;
  const trimmed = lap.trim();
  // M:SS.mmm / M'SS.mmm
  const withMin = /^(\d+)[:'](\d{1,2})(?:\.(\d{1,3}))?$/.exec(trimmed);
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
  labelKey?: string;
  /** 車両固有の保存済み項目など、翻訳対象外の動的ラベル */
  label?: string;
  unit?: string;
  /** 各セットアップから取り出す値（数値 or 文字列 or null） */
  get: (s: CarSetup) => number | string | boolean | null | undefined;
  /** true の場合、数値差分（+5 等）を表示する */
  numeric?: boolean;
}

export interface CompareSection {
  titleKey: string;
  rows: CompareRow[];
}

export interface ResolvedCompareRow extends CompareRow { label: string }
export interface ResolvedCompareSection { titleKey: string; title: string; rows: ResolvedCompareRow[] }

/** 翻訳キーを表示文字列へ解決する。入力定義は変更しない。 */
export function resolveCompareSections(
  sections: CompareSection[],
  t: TFunction,
): ResolvedCompareSection[] {
  return sections.map((section) => ({
    ...section,
    title: t(section.titleKey),
    rows: section.rows.map((row) => {
      let get = row.get;
      if (row.labelKey === 'compare.fields.sessionType') {
        get = (setup) => t(sessionTypeTranslationKey(setup.sessionType));
      } else if (row.labelKey === 'compare.fields.weather') {
        get = (setup) => {
          const key = weatherTranslationKey(setup.weather.condition);
          return key ? t(`common.${key}`) : null;
        };
      }
      return { ...row, label: row.labelKey ? t(row.labelKey) : (row.label ?? ''), get };
    }),
  }));
}

/** 比較ビューに表示する全セクション定義（単位はラベル横に併記） */
export function buildCompareSections(setups: CarSetup[] = []): CompareSection[] {
  const sections: CompareSection[] = [
    {
      titleKey: 'compare.sections.session',
      rows: [
        { labelKey: 'compare.fields.circuit', get: (s) => s.circuit },
        { labelKey: 'compare.fields.carModel', get: (s) => s.carModel },
        { labelKey: 'compare.fields.driver', get: (s) => s.driver ?? null },
        { labelKey: 'compare.fields.sessionType', get: (s) => s.sessionType },
        { labelKey: 'compare.fields.distance', unit: UNITS.distance, numeric: true, get: (s) => s.sessionInfo.distance },
        { labelKey: 'compare.fields.fuel', unit: UNITS.fuel, numeric: true, get: (s) => s.sessionInfo.fuel },
      ],
    },
    {
      titleKey: 'compare.sections.weather',
      rows: [
        { labelKey: 'compare.fields.weather', get: (s) => legacyWeatherLabel(s.weather.condition) },
        { labelKey: 'compare.fields.airTemp', unit: UNITS.temperature, numeric: true, get: (s) => s.weather.airTemp },
        { labelKey: 'compare.fields.trackTemp', unit: UNITS.temperature, numeric: true, get: (s) => s.weather.trackTemp },
        { labelKey: 'compare.fields.humidity', unit: UNITS.humidity, numeric: true, get: (s) => s.weather.humidity },
        { labelKey: 'compare.fields.pressure', unit: UNITS.atmosphericPressure, numeric: true, get: (s) => s.weather.pressure },
      ],
    },
    {
      titleKey: 'compare.sections.tirePressureBefore',
      rows: [
        { labelKey: 'compare.fields.flBefore', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fl.before },
        { labelKey: 'compare.fields.frBefore', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fr.before },
        { labelKey: 'compare.fields.rlBefore', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rl.before },
        { labelKey: 'compare.fields.rrBefore', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rr.before },
      ],
    },
    {
      titleKey: 'compare.sections.tirePressureAfter',
      rows: [
        { labelKey: 'compare.fields.flAfter', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fl.after },
        { labelKey: 'compare.fields.frAfter', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.fr.after },
        { labelKey: 'compare.fields.rlAfter', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rl.after },
        { labelKey: 'compare.fields.rrAfter', unit: UNITS.pressure, numeric: true, get: (s) => s.tireSettings.rr.after },
      ],
    },
    {
      titleKey: 'compare.sections.tires',
      rows: [
        { labelKey: 'compare.fields.tireSetId', get: (s) => s.tireInfo.tireSetCode || null },
        { labelKey: 'compare.fields.manufacturer', get: (s) => s.tireInfo.manufacturer || s.tireInfo.brand || null },
        { labelKey: 'compare.fields.productName', get: (s) => s.tireInfo.productName || null },
        { labelKey: 'compare.fields.compound', get: (s) => s.tireInfo.compound || null },
        { labelKey: 'compare.fields.frontSize', get: (s) => s.tireInfo.frontSize || null },
        { labelKey: 'compare.fields.rearSize', get: (s) => s.tireInfo.rearSize || null },
        { labelKey: 'compare.fields.heatCyclesAdded', numeric: true, unit: '回', get: (s) => s.tireUsage?.heatCyclesAdded ?? null },
      ],
    },
    {
      titleKey: 'compare.sections.suspension',
      rows: [
        { labelKey: 'compare.fields.frontDamperCompression', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.frontDamper.compression ?? null },
        { labelKey: 'compare.fields.frontDamperRebound', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.frontDamper.rebound ?? null },
        { labelKey: 'compare.fields.rearDamperCompression', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.rearDamper.compression ?? null },
        { labelKey: 'compare.fields.rearDamperRebound', unit: UNITS.damper, numeric: true, get: (s) => s.suspensionSettings?.rearDamper.rebound ?? null },
        { labelKey: 'compare.fields.frontSpringRate', unit: UNITS.springRate, numeric: true, get: (s) => s.suspensionSettings?.springRate.front ?? null },
        { labelKey: 'compare.fields.rearSpringRate', unit: UNITS.springRate, numeric: true, get: (s) => s.suspensionSettings?.springRate.rear ?? null },
        { labelKey: 'compare.fields.frontRideHeight', unit: UNITS.rideHeight, numeric: true, get: (s) => s.suspensionSettings?.rideHeight.front ?? null },
        { labelKey: 'compare.fields.rearRideHeight', unit: UNITS.rideHeight, numeric: true, get: (s) => s.suspensionSettings?.rideHeight.rear ?? null },
        { labelKey: 'compare.fields.frontAntiRollBar', numeric: true, get: (s) => s.suspensionSettings?.antiRollBar.front ?? null },
        { labelKey: 'compare.fields.rearAntiRollBar', numeric: true, get: (s) => s.suspensionSettings?.antiRollBar.rear ?? null },
      ],
    },
    {
      titleKey: 'compare.sections.alignment',
      rows: [
        { labelKey: 'compare.fields.frontCamber', unit: UNITS.angle, numeric: true, get: (s) => s.alignmentSettings?.camber.front ?? null },
        { labelKey: 'compare.fields.rearCamber', unit: UNITS.angle, numeric: true, get: (s) => s.alignmentSettings?.camber.rear ?? null },
        { labelKey: 'compare.fields.frontToe', unit: UNITS.rideHeight, numeric: true, get: (s) => s.alignmentSettings?.toe.front ?? null },
        { labelKey: 'compare.fields.rearToe', unit: UNITS.rideHeight, numeric: true, get: (s) => s.alignmentSettings?.toe.rear ?? null },
        { labelKey: 'compare.fields.caster', unit: UNITS.angle, numeric: true, get: (s) => s.alignmentSettings?.caster ?? null },
      ],
    },
    {
      titleKey: 'compare.sections.brakes',
      rows: [
        { labelKey: 'compare.fields.frontPad', get: (s) => s.brakeSettings?.frontPad || null },
        { labelKey: 'compare.fields.rearPad', get: (s) => s.brakeSettings?.rearPad || null },
        { labelKey: 'compare.fields.frontRotor', get: (s) => s.brakeSettings?.frontRotor || null },
        { labelKey: 'compare.fields.rearRotor', get: (s) => s.brakeSettings?.rearRotor || null },
        { labelKey: 'compare.fields.frontBrakeBalance', unit: '%', numeric: true, get: (s) => s.brakeSettings?.balance ?? null },
      ],
    },
    {
      titleKey: 'compare.sections.aeroEngine',
      rows: [
        { labelKey: 'compare.fields.frontAero', numeric: true, get: (s) => s.aeroSettings?.front ?? null },
        { labelKey: 'compare.fields.rearAero', numeric: true, get: (s) => s.aeroSettings?.rear ?? null },
        { labelKey: 'compare.fields.ecuMap', get: (s) => s.engineSettings?.ecuMap || null },
        { labelKey: 'compare.fields.boost', unit: 'kPa', numeric: true, get: (s) => s.engineSettings?.boost ?? null },
      ],
    },
    {
      titleKey: 'compare.sections.lapTime',
      rows: [
        { labelKey: 'compare.fields.bestLap', get: (s) => s.lapTimeData?.bestLap ?? null },
        { labelKey: 'compare.fields.totalLaps', numeric: true, get: (s) => s.lapTimeData?.totalLaps ?? null },
      ],
    },
  ];

  const adjustmentSnapshots = new Map<string, NonNullable<CarSetup['adjustmentValues']>[number]>();
  setups.forEach((setup) => {
    setup.adjustmentValues?.forEach((entry) => {
      if (!adjustmentSnapshots.has(entry.definitionId)) adjustmentSnapshots.set(entry.definitionId, entry);
    });
  });

  if (adjustmentSnapshots.size > 0) {
    sections.splice(sections.length - 1, 0, {
      titleKey: 'compare.sections.vehicleSpecific',
      rows: Array.from(adjustmentSnapshots.values()).map((snapshot) => ({
        label: snapshot.label,
        unit: snapshot.unit,
        numeric: snapshot.valueType === 'number',
        get: (setup) => setup.adjustmentValues
          ?.find((entry) => entry.definitionId === snapshot.definitionId)
          ?.value ?? null,
      })),
    });
  }

  return sections;
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
