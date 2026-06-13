import { describe, it, expect } from 'vitest';
import { calcPressureAdvice, formatAdjust, getWheelTarget } from './pressureAdvice';

// ─── calcPressureAdvice ──────────────────────────────────────────────────────

describe('calcPressureAdvice — null の組み合わせ', () => {
  it('実測が null → status=none, diff=null, adjustBy=null', () => {
    const r = calcPressureAdvice(null, 200);
    expect(r.status).toBe('none');
    expect(r.diff).toBeNull();
    expect(r.adjustBy).toBeNull();
  });

  it('目標が null → status=none, diff=null, adjustBy=null', () => {
    const r = calcPressureAdvice(200, null);
    expect(r.status).toBe('none');
    expect(r.diff).toBeNull();
    expect(r.adjustBy).toBeNull();
  });

  it('両方 null → status=none', () => {
    const r = calcPressureAdvice(null, null);
    expect(r.status).toBe('none');
    expect(r.diff).toBeNull();
  });
});

describe('calcPressureAdvice — 境界値: ±5 kPa (green)', () => {
  it('diff = 0 → green', () => {
    const r = calcPressureAdvice(200, 200);
    expect(r.status).toBe('green');
    expect(r.diff).toBe(0);
    expect(r.adjustBy).toBe(0);
  });

  it('diff = +5 → green（上限境界）', () => {
    const r = calcPressureAdvice(205, 200);
    expect(r.status).toBe('green');
    expect(r.diff).toBe(5);
    expect(r.adjustBy).toBe(-5);
  });

  it('diff = -5 → green（下限境界）', () => {
    const r = calcPressureAdvice(195, 200);
    expect(r.status).toBe('green');
    expect(r.diff).toBe(-5);
    expect(r.adjustBy).toBe(5);
  });
});

describe('calcPressureAdvice — 境界値: ±6〜±15 kPa (yellow)', () => {
  it('diff = +6 → yellow（green 超え）', () => {
    const r = calcPressureAdvice(206, 200);
    expect(r.status).toBe('yellow');
    expect(r.diff).toBe(6);
    expect(r.adjustBy).toBe(-6);
  });

  it('diff = -6 → yellow', () => {
    const r = calcPressureAdvice(194, 200);
    expect(r.status).toBe('yellow');
    expect(r.diff).toBe(-6);
  });

  it('diff = +15 → yellow（上限境界）', () => {
    const r = calcPressureAdvice(215, 200);
    expect(r.status).toBe('yellow');
    expect(r.diff).toBe(15);
    expect(r.adjustBy).toBe(-15);
  });

  it('diff = -15 → yellow（下限境界）', () => {
    const r = calcPressureAdvice(185, 200);
    expect(r.status).toBe('yellow');
    expect(r.diff).toBe(-15);
    expect(r.adjustBy).toBe(15);
  });
});

describe('calcPressureAdvice — 境界値: ±16+ kPa (red)', () => {
  it('diff = +16 → red（yellow 超え）', () => {
    const r = calcPressureAdvice(216, 200);
    expect(r.status).toBe('red');
    expect(r.diff).toBe(16);
    expect(r.adjustBy).toBe(-16);
  });

  it('diff = -16 → red', () => {
    const r = calcPressureAdvice(184, 200);
    expect(r.status).toBe('red');
    expect(r.diff).toBe(-16);
    expect(r.adjustBy).toBe(16);
  });

  it('diff = +50 → red（大きく外れ）', () => {
    const r = calcPressureAdvice(250, 200);
    expect(r.status).toBe('red');
    expect(r.diff).toBe(50);
    expect(r.adjustBy).toBe(-50);
  });
});

describe('calcPressureAdvice — adjustBy の符号確認', () => {
  it('実測が目標より高い → adjustBy 負（冷間を下げる）', () => {
    // after=210, target=200 → diff=+10 → adjustBy=-10
    const r = calcPressureAdvice(210, 200);
    expect(r.adjustBy).toBe(-10);
  });

  it('実測が目標より低い → adjustBy 正（冷間を上げる）', () => {
    // after=190, target=200 → diff=-10 → adjustBy=+10
    const r = calcPressureAdvice(190, 200);
    expect(r.adjustBy).toBe(10);
  });
});

// ─── getWheelTarget ──────────────────────────────────────────────────────────

describe('getWheelTarget', () => {
  it('FL は front を返す', () => {
    expect(getWheelTarget('fl', 200, 180)).toBe(200);
  });
  it('FR は front を返す', () => {
    expect(getWheelTarget('fr', 200, 180)).toBe(200);
  });
  it('RL は rear を返す', () => {
    expect(getWheelTarget('rl', 200, 180)).toBe(180);
  });
  it('RR は rear を返す', () => {
    expect(getWheelTarget('rr', 200, 180)).toBe(180);
  });
  it('front が null なら FL は null', () => {
    expect(getWheelTarget('fl', null, 180)).toBeNull();
  });
  it('rear が null なら RL は null', () => {
    expect(getWheelTarget('rl', 200, null)).toBeNull();
  });
});

// ─── formatAdjust ────────────────────────────────────────────────────────────

describe('formatAdjust', () => {
  it('null → "—"', () => {
    expect(formatAdjust(null)).toBe('—');
  });
  it('0 → "調整不要"', () => {
    expect(formatAdjust(0)).toBe('調整不要');
  });
  it('正値 → プラス符号付き', () => {
    expect(formatAdjust(7)).toBe('冷間を +7 kPa');
  });
  it('負値 → マイナス符号付き', () => {
    expect(formatAdjust(-7)).toBe('冷間を -7 kPa');
  });
});
