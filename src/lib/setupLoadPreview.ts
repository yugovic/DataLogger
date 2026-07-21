// 読込導線（複製 / 引き継ぎ）の実行前プレビューを組み立てる純粋関数。
//
// WP4: 「直近セッションを複製」と「同じ車種の設定を引き継ぐ」は、実行前に
// コピー元の車種・サーキット・日時・対象項目をユーザーへ提示してから実行する。
// ここでは Modal 表示用のプレーンなデータ構造だけを生成し、副作用は持たない。

import type { CarSetup } from '../types/setup';
import type { SupportedLocale } from '../i18n/locale';
import { formatDateTime } from '../i18n/formatters';

// このモジュールは lib 層（React コンポーネント外）で動くため、useTranslation の t() は使えない。
// 日本語ハードコードを避けるため、表示ラベルは i18n のキー（labelKey）だけを返し、
// 実際の翻訳は表示側（呼び出し元コンポーネント）で t(labelKey) する。
// 車種・サーキットの未設定フォールバックも null を返し、表示側で t() する。
// 日付フォーマットは呼び出し元のロケールを受け取って locale 対応の formatDateTime を使う。

/** source.date（Date か文字列/数値）を Date に正規化する */
const toDate = (d: CarSetup['date']): Date => (d instanceof Date ? d : new Date(d));

/** 実行前プレビューの日時表示（呼び出し元ロケールに追従） */
export const formatLoadPreviewDate = (d: CarSetup['date'], locale: SupportedLocale): string =>
  formatDateTime(toDate(d), locale);

/** プレビュー内の1カテゴリ（対象項目）。filled=コピー元に値があるか、labelKey=i18nキー */
export interface LoadPreviewItem {
  labelKey: string;
  filled: boolean;
}

export interface DuplicatePreview {
  /** コピー元の車種。未設定なら null（表示側で t() する） */
  carModel: string | null;
  /** コピー元のサーキット。未設定なら null（表示側で t() する） */
  circuit: string | null;
  dateLabel: string;
  /** 複製で引き継がれる項目カテゴリ（値の有無つき） */
  copiedItems: LoadPreviewItem[];
  /** 新規セッションとして初期化される項目（i18nキー） */
  resetItems: string[];
}

export interface InheritPreview {
  carModel: string | null;
  circuit: string | null;
  dateLabel: string;
  /** セッション非依存で引き継がれる項目カテゴリ（値の有無つき） */
  inheritedItems: LoadPreviewItem[];
  /** 引き継がれない（現在の入力が保持される）項目（i18nキー） */
  keptItems: string[];
}

const hasSuspensionDamper = (setup: CarSetup): boolean => {
  const s = setup.suspensionSettings;
  if (!s) return false;
  return [
    s.frontDamper.compression,
    s.frontDamper.rebound,
    s.rearDamper.compression,
    s.rearDamper.rebound,
  ].some((v) => v !== null && v !== undefined);
};

const hasSuspensionGeometry = (setup: CarSetup): boolean => {
  const s = setup.suspensionSettings;
  if (!s) return false;
  return [
    s.springRate.front,
    s.springRate.rear,
    s.rideHeight.front,
    s.rideHeight.rear,
    s.antiRollBar.front,
    s.antiRollBar.rear,
  ].some((v) => v !== null && v !== undefined);
};

const hasAlignment = (setup: CarSetup): boolean => {
  const a = setup.alignmentSettings;
  if (!a) return false;
  return [a.camber.front, a.camber.rear, a.toe.front, a.toe.rear, a.caster].some(
    (v) => v !== null && v !== undefined,
  );
};

const hasTire = (setup: CarSetup): boolean =>
  Boolean(setup.tireInfo.brand || setup.tireInfo.compound);

const hasEnvironment = (setup: CarSetup): boolean => {
  const w = setup.weather;
  return (
    Boolean(w.condition) ||
    [w.airTemp, w.trackTemp, w.humidity, w.pressure].some((v) => v !== null && v !== undefined)
  );
};

const hasTirePressures = (setup: CarSetup): boolean => {
  const t = setup.tireSettings;
  return (['fl', 'fr', 'rl', 'rr'] as const).some(
    (k) => t[k].before !== null && t[k].before !== undefined,
  );
};

/**
 * 「直近セッションを複製」の実行前プレビュー。
 * copySetupToDraft と同じ範囲（設定値・実測値は引き継ぎ、ラップ/証憑/共有/日時は初期化）を説明する。
 */
export const buildDuplicatePreview = (
  source: CarSetup,
  locale: SupportedLocale,
): DuplicatePreview => ({
  carModel: source.carModel || null,
  circuit: source.circuit || null,
  dateLabel: formatLoadPreviewDate(source.date, locale),
  copiedItems: [
    { labelKey: 'setup.preview.items.environment', filled: hasEnvironment(source) },
    { labelKey: 'setup.preview.items.tireInfo', filled: hasTire(source) },
    { labelKey: 'setup.preview.items.tirePressure', filled: hasTirePressures(source) },
    { labelKey: 'setup.preview.items.damper', filled: hasSuspensionDamper(source) },
    { labelKey: 'setup.preview.items.springHeightArb', filled: hasSuspensionGeometry(source) },
    { labelKey: 'setup.preview.items.alignment', filled: hasAlignment(source) },
  ],
  resetItems: [
    'setup.preview.reset.dateNow',
    'setup.preview.reset.lapTime',
    'setup.preview.reset.evidence',
    'setup.preview.reset.telemetry',
    'setup.preview.reset.shareState',
  ],
});

/**
 * 「同じ車種の設定を引き継ぐ」の実行前プレビュー。
 * inheritSetupSettings と同じ範囲（セッション非依存値だけ）を説明する。
 */
export const buildInheritPreview = (
  source: CarSetup,
  locale: SupportedLocale,
): InheritPreview => ({
  carModel: source.carModel || null,
  circuit: source.circuit || null,
  dateLabel: formatLoadPreviewDate(source.date, locale),
  inheritedItems: [
    { labelKey: 'setup.preview.items.tireBrandCompound', filled: hasTire(source) },
    { labelKey: 'setup.preview.items.damper', filled: hasSuspensionDamper(source) },
    { labelKey: 'setup.preview.items.springHeightArb', filled: hasSuspensionGeometry(source) },
    { labelKey: 'setup.preview.items.alignment', filled: hasAlignment(source) },
  ],
  keptItems: [
    'setup.preview.kept.measuredPressure',
    'setup.preview.kept.weatherTemps',
    'setup.preview.kept.lapTime',
    'setup.preview.kept.distanceFuel',
    'setup.preview.kept.dateTime',
  ],
});
