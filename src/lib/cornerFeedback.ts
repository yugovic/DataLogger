/**
 * コーナー区分つきフィーリング記録の純粋ロジック
 *
 * 「アンダー／オーバー」だけでは記録として足りない。
 * **どの速度域の、どの局面で**出たのかが、セットアップを動かす手がかりになる。
 * 総合バランス1つに集約したのは省略しすぎだった。
 *
 * ピットでの入力コストを抑えるため、9項目すべてを聞くのではなく
 * 「どこで気になったか」を選ばせ、その1点だけ方向を聞く形にする。
 * 気になった箇所が複数あれば繰り返せる。
 *
 * 触っていない項目は null のまま（「気にならなかった」を N で埋めない）。
 */
import type { DrivingFeedback } from '../types/setup';

/** 速度域。低速/高速だけでは言い分けられないので中速を持つ */
export const SPEED_RANGES = ['low', 'mid', 'high'] as const;
export type SpeedRange = (typeof SPEED_RANGES)[number];

/** コーナーの局面 */
export const CORNER_PHASES = ['entry', 'middle', 'exit'] as const;
export type CornerPhase = (typeof CORNER_PHASES)[number];

/** 速度域×局面 の識別子（9通り） */
export interface CornerSpot {
  speed: SpeedRange;
  phase: CornerPhase;
}

/** バランスの5段階。DrivingFeedback の 0〜4 と一致させる */
export const BALANCE_VALUES = [0, 1, 2, 3, 4] as const;

/** CornerSpot → DrivingFeedback のフィールド名 */
export function fieldFor(spot: CornerSpot): keyof DrivingFeedback {
  const speed = { low: 'lowSpeed', mid: 'midSpeed', high: 'highSpeed' }[spot.speed];
  const phase = { entry: 'Entry', middle: 'Middle', exit: 'Exit' }[spot.phase];
  return `${speed}${phase}` as keyof DrivingFeedback;
}

/** 9通りすべて（表示順は 低速→中速→高速 × 進入→中間→立ち上がり） */
export function allSpots(): CornerSpot[] {
  const out: CornerSpot[] = [];
  for (const speed of SPEED_RANGES) {
    for (const phase of CORNER_PHASES) out.push({ speed, phase });
  }
  return out;
}

/** その箇所に評価が入っているか */
export function valueAt(feedback: DrivingFeedback, spot: CornerSpot): number | null {
  const v = feedback[fieldFor(spot)];
  return typeof v === 'number' ? v : null;
}

/** 評価済みの箇所を列挙する */
export function ratedSpots(feedback: DrivingFeedback): CornerSpot[] {
  return allSpots().filter((s) => valueAt(feedback, s) !== null);
}

/**
 * フィーリングの記録が済んでいるか。
 * コーナー別に1つでも入っているか、総合バランスが入っていればよい。
 * 「気にならなかった」は総合バランスに残す（9項目を N で埋めない）。
 */
export function hasFeedback(feedback: DrivingFeedback): boolean {
  return feedback.overallBalance != null || ratedSpots(feedback).length > 0;
}

/**
 * 評価から「要注意の箇所」を選ぶ。
 * ニュートラル(2)から離れているものほど手がかりが大きい。同点なら表示順で先のもの。
 */
export function mostDeviatedSpot(feedback: DrivingFeedback): CornerSpot | null {
  let best: { spot: CornerSpot; d: number } | null = null;
  for (const spot of ratedSpots(feedback)) {
    const d = Math.abs((valueAt(feedback, spot) as number) - 2);
    if (d === 0) continue;
    if (!best || d > best.d) best = { spot, d };
  }
  return best?.spot ?? null;
}
