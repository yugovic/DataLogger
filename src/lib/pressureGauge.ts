/**
 * リングゲージ（洗練モード）の純粋計算
 *
 * 表示・入力の両方で使う値↔角度の変換と、長押しの加速量をここに集約する。
 * UI から切り離しておくことで、加速の速さのような「体感で決める値」を
 * テストで固定できる（最初の実装は3秒で +174 kPa 動いてしまい実用外だった）。
 */

/** ゲージの表示範囲。これを外れる値は端で止めて描く（針が一周しない） */
export const GAUGE_MIN = 180;
export const GAUGE_MAX = 260;
/** ゲージの角度範囲。真上を0°として左右に振る */
export const GAUGE_SWEEP_DEG = 270;

/** 保存してよい実在範囲。打ち間違いをそのまま残さない */
export const VALUE_MIN = 50;
export const VALUE_MAX = 400;

/** 値をゲージ上の角度(度)へ。範囲外は端でクランプする */
export function valueToAngle(value: number): number {
  const shown = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, value));
  const t = (shown - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
  return -GAUGE_SWEEP_DEG / 2 + t * GAUGE_SWEEP_DEG;
}

/** 保存可能な範囲に丸める */
export function clampValue(value: number): number {
  return Math.round(Math.max(VALUE_MIN, Math.min(VALUE_MAX, value)));
}

// ── 長押しの加速 ────────────────────────────────────────────
//
// 速さは「実際にやる補正量」から決める。タイヤ空気圧の手直しは
// ふつう ±数 kPa、大きくても ±30 kPa 程度で、200 kPa 動かす場面は無い。
// 3秒押し続けて 30 kPa 前後に届く速さを上限とする。

/** これ以前に離したら単発タップ（1 kPa だけ動く） */
export const HOLD_DELAY_MS = 380;
/** 押し始めの刻み間隔。約 7.7 歩/秒 */
export const SLOW_STEP_MS = 130;
/** これ以降は速い刻みへ移る */
export const FAST_AT_MS = 1200;
/** 速い刻みの間隔。約 14 歩/秒 */
export const FAST_STEP_MS = 70;

/**
 * 押し始めから elapsed ms 時点で、初回の1歩を除いて何歩進んでいるべきか。
 *
 * 「経過時間から到達すべき歩数を求め、差分だけ適用する」形にしてある。
 * ネストした setTimeout で間隔を縮める方式は、刻みの更新を取りこぼしても
 * 等速のまま気づけないので採らない。
 */
export function holdStepsAt(elapsedMs: number): number {
  if (elapsedMs < HOLD_DELAY_MS) return 0;
  if (elapsedMs < FAST_AT_MS) {
    return Math.floor((elapsedMs - HOLD_DELAY_MS) / SLOW_STEP_MS);
  }
  const slow = Math.floor((FAST_AT_MS - HOLD_DELAY_MS) / SLOW_STEP_MS);
  return slow + Math.floor((elapsedMs - FAST_AT_MS) / FAST_STEP_MS);
}

/** 押し始めから elapsed ms 時点での総変化量（初回の1歩を含む） */
export function holdDeltaAt(elapsedMs: number): number {
  return holdStepsAt(elapsedMs) + 1;
}
