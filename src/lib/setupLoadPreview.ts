// 読込導線（複製 / 引き継ぎ）の実行前プレビューを組み立てる純粋関数。
//
// WP4: 「直近セッションを複製」と「同じ車種の設定を引き継ぐ」は、実行前に
// コピー元の車種・サーキット・日時・対象項目をユーザーへ提示してから実行する。
// ここでは Modal 表示用のプレーンなデータ構造だけを生成し、副作用は持たない。

import type { CarSetup } from '../types/setup';

/** source.date（Date か文字列/数値）を Date に正規化する */
const toDate = (d: CarSetup['date']): Date => (d instanceof Date ? d : new Date(d));

/** 実行前プレビューの日時表示（例: 2026/7/19 14:30） */
export const formatLoadPreviewDate = (d: CarSetup['date']): string => {
  const date = toDate(d);
  return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

/** プレビュー内の1カテゴリ（対象項目）。filled=コピー元に値があるか */
export interface LoadPreviewItem {
  label: string;
  filled: boolean;
}

export interface DuplicatePreview {
  carModel: string;
  circuit: string;
  dateLabel: string;
  /** 複製で引き継がれる項目カテゴリ（値の有無つき） */
  copiedItems: LoadPreviewItem[];
  /** 新規セッションとして初期化される項目 */
  resetItems: string[];
}

export interface InheritPreview {
  carModel: string;
  circuit: string;
  dateLabel: string;
  /** セッション非依存で引き継がれる項目カテゴリ（値の有無つき） */
  inheritedItems: LoadPreviewItem[];
  /** 引き継がれない（現在の入力が保持される）項目 */
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
export const buildDuplicatePreview = (source: CarSetup): DuplicatePreview => ({
  carModel: source.carModel || '（車種未設定）',
  circuit: source.circuit || '（サーキット未設定）',
  dateLabel: formatLoadPreviewDate(source.date),
  copiedItems: [
    { label: '環境データ（天候・気温・路温ほか）', filled: hasEnvironment(source) },
    { label: 'タイヤ情報（銘柄・コンパウンド）', filled: hasTire(source) },
    { label: 'タイヤ空気圧', filled: hasTirePressures(source) },
    { label: 'ダンパー（Bump / Rebound）', filled: hasSuspensionDamper(source) },
    { label: 'スプリング / 車高 / スタビ', filled: hasSuspensionGeometry(source) },
    { label: 'アライメント（キャンバー / トー / キャスター）', filled: hasAlignment(source) },
  ],
  resetItems: ['日時（現在時刻）', 'ラップタイム', 'ロガー証憑', 'テレメトリ', '公開・共有状態'],
});

/**
 * 「同じ車種の設定を引き継ぐ」の実行前プレビュー。
 * inheritSetupSettings と同じ範囲（セッション非依存値だけ）を説明する。
 */
export const buildInheritPreview = (source: CarSetup): InheritPreview => ({
  carModel: source.carModel || '（車種未設定）',
  circuit: source.circuit || '（サーキット未設定）',
  dateLabel: formatLoadPreviewDate(source.date),
  inheritedItems: [
    { label: 'タイヤ銘柄・コンパウンド', filled: hasTire(source) },
    { label: 'ダンパー（Bump / Rebound）', filled: hasSuspensionDamper(source) },
    { label: 'スプリング / 車高 / スタビ', filled: hasSuspensionGeometry(source) },
    { label: 'アライメント（キャンバー / トー / キャスター）', filled: hasAlignment(source) },
  ],
  keptItems: [
    'タイヤ空気圧の実測値',
    '天候・気温・路温',
    'ラップタイム',
    '走行距離・燃料',
    '日時',
  ],
});
