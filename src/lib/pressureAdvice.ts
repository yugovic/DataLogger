/**
 * 空気圧判断支援ロジック（純粋関数）
 *
 * 目標温間圧と実測温間圧（走行後）の差から:
 * - 状態色（green / yellow / red / none）
 * - 次走行の冷間圧調整推奨値
 * を計算する。
 *
 * 物理モデルは使用しない。差分ベースの素朴な計算で十分（WP7要件）。
 */

export type PressureStatus = 'green' | 'yellow' | 'red' | 'none';

export interface PressureAdviceResult {
  /** 実測 − 目標 (kPa)。どちらかが null なら null */
  diff: number | null;
  /** 状態色。目標未設定または実測未入力時は 'none' */
  status: PressureStatus;
  /**
   * 次走行への冷間圧調整推奨値 (kPa)。
   * 「冷間を adjustBy kPa 変化させる」という提案。
   * diff が null（目標 or 実測が未入力）の場合は null。
   */
  adjustBy: number | null;
}

/**
 * 単輪分の空気圧アドバイスを計算する。
 *
 * @param afterKPa   走行後の実測温間圧 (kPa)。未入力時 null
 * @param targetKPa  目標温間圧 (kPa)。未設定時 null
 * @returns PressureAdviceResult
 *
 * 色分けルール:
 *   |diff| <= 5  → green
 *   |diff| <= 15 → yellow
 *   |diff| >  15 → red
 *   目標または実測が null → none（偽の正常表示をしない）
 */
export function calcPressureAdvice(
  afterKPa: number | null,
  targetKPa: number | null,
): PressureAdviceResult {
  if (afterKPa === null || targetKPa === null) {
    return { diff: null, status: 'none', adjustBy: null };
  }

  const diff = afterKPa - targetKPa;

  let status: PressureStatus;
  const absDiff = Math.abs(diff);
  if (absDiff <= 5) {
    status = 'green';
  } else if (absDiff <= 15) {
    status = 'yellow';
  } else {
    status = 'red';
  }

  // 次走行の冷間調整: 目標温間より高い → 冷間を下げる（マイナス値）。低い → 上げる（プラス値）。
  // 計算: adjustBy = targetKPa - afterKPa
  // 「走行後が目標より +7kPa 高い」 → 「冷間を −7kPa する」
  // diff===0 の場合は必ず 0 を返す（-0 回避）
  const adjustBy = diff === 0 ? 0 : -diff;

  return { diff, status, adjustBy };
}

/**
 * 前後軸の目標圧から各輪の目標圧を返すユーティリティ。
 * FL/FR は front、RL/RR は rear を使う。
 */
export function getWheelTarget(
  wheel: 'fl' | 'fr' | 'rl' | 'rr',
  front: number | null,
  rear: number | null,
): number | null {
  return wheel === 'fl' || wheel === 'fr' ? front : rear;
}

/**
 * 調整推奨値を日本語文字列にフォーマットする。
 * null の場合は '—' を返す（未入力の明示）。
 *
 * @example
 *   formatAdjust(-7) // => '冷間を −7 kPa'
 *   formatAdjust(3)  // => '冷間を +3 kPa'
 *   formatAdjust(0)  // => '調整不要'
 *   formatAdjust(null) // => '—'
 */
export function formatAdjust(adjustBy: number | null): string {
  if (adjustBy === null) return '—';
  if (adjustBy === 0) return '調整不要';
  const sign = adjustBy > 0 ? '+' : '';
  return `冷間を ${sign}${adjustBy} kPa`;
}
