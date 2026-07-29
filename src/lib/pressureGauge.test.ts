import { describe, it, expect } from 'vitest';
import {
  valueToAngle, clampValue, holdStepsAt, holdDeltaAt,
  GAUGE_MIN, GAUGE_MAX, VALUE_MIN, VALUE_MAX, HOLD_DELAY_MS,
} from './pressureGauge';

describe('valueToAngle', () => {
  it('表示範囲の中央は真上(0°)', () => {
    expect(valueToAngle((GAUGE_MIN + GAUGE_MAX) / 2)).toBeCloseTo(0, 5);
  });

  it('下限は -135°、上限は +135°', () => {
    expect(valueToAngle(GAUGE_MIN)).toBeCloseTo(-135, 5);
    expect(valueToAngle(GAUGE_MAX)).toBeCloseTo(135, 5);
  });

  it('表示範囲を外れても端で止まる（針が一周しない）', () => {
    expect(valueToAngle(50)).toBeCloseTo(-135, 5);
    expect(valueToAngle(400)).toBeCloseTo(135, 5);
  });

  it('値が増えれば角度も増える', () => {
    expect(valueToAngle(200)).toBeLessThan(valueToAngle(220));
    expect(valueToAngle(220)).toBeLessThan(valueToAngle(240));
  });
});

describe('clampValue', () => {
  it('実在範囲に収める', () => {
    expect(clampValue(215)).toBe(215);
    expect(clampValue(10)).toBe(VALUE_MIN);
    expect(clampValue(999)).toBe(VALUE_MAX);
  });

  it('整数に丸める（1 kPa 単位）', () => {
    expect(clampValue(215.4)).toBe(215);
    expect(clampValue(215.6)).toBe(216);
  });
});

describe('holdStepsAt / holdDeltaAt（長押しの加速）', () => {
  it('押した直後は単発タップぶんだけ（1 kPa）', () => {
    expect(holdDeltaAt(0)).toBe(1);
    expect(holdDeltaAt(HOLD_DELAY_MS - 1)).toBe(1);
  });

  it('1秒で 3〜9 kPa。細かい直しができる速さ', () => {
    const d = holdDeltaAt(1000);
    expect(d).toBeGreaterThanOrEqual(3);
    expect(d).toBeLessThanOrEqual(9);
  });

  it('2秒で 12〜26 kPa', () => {
    const d = holdDeltaAt(2000);
    expect(d).toBeGreaterThanOrEqual(12);
    expect(d).toBeLessThanOrEqual(26);
  });

  it('3秒で 24〜45 kPa。実作業の補正量(±30程度)に届く', () => {
    const d = holdDeltaAt(3000);
    expect(d).toBeGreaterThanOrEqual(24);
    expect(d).toBeLessThanOrEqual(45);
  });

  it('暴走しない。5秒押しても 80 kPa を超えない', () => {
    // 最初の実装は2秒で +174 kPa 動いてしまい、実用範囲を大きく外していた
    expect(holdDeltaAt(5000)).toBeLessThan(80);
  });

  it('単調に増え、戻らない', () => {
    let prev = -1;
    for (let t = 0; t <= 6000; t += 50) {
      const v = holdStepsAt(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
