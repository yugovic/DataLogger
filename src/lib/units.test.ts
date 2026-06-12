import { describe, it, expect } from 'vitest';
import { toNumberOrNull, toIntOrNull, calcPressureDiff } from './units';

// ─── toNumberOrNull ─────────────────────────────────────────────────────────

describe('toNumberOrNull', () => {
  it('空文字は null を返す', () => {
    expect(toNumberOrNull('')).toBeNull();
  });

  it('スペースのみは null を返す', () => {
    expect(toNumberOrNull('   ')).toBeNull();
  });

  it("'0' は 0 を返す（0→null 変換禁止）", () => {
    expect(toNumberOrNull('0')).toBe(0);
  });

  it("'12.5' は 12.5 を返す", () => {
    expect(toNumberOrNull('12.5')).toBe(12.5);
  });

  it("非数値文字列 'abc' は null を返す", () => {
    expect(toNumberOrNull('abc')).toBeNull();
  });

  it('null は null を返す', () => {
    expect(toNumberOrNull(null)).toBeNull();
  });

  it('undefined は null を返す', () => {
    expect(toNumberOrNull(undefined)).toBeNull();
  });

  it("負数 '-180.5' は -180.5 を返す", () => {
    expect(toNumberOrNull('-180.5')).toBe(-180.5);
  });
});

// ─── toIntOrNull ─────────────────────────────────────────────────────────────

describe('toIntOrNull', () => {
  it('空文字は null を返す', () => {
    expect(toIntOrNull('')).toBeNull();
  });

  it("'0' は 0 を返す", () => {
    expect(toIntOrNull('0')).toBe(0);
  });

  it("'42' は 42 を返す", () => {
    expect(toIntOrNull('42')).toBe(42);
  });

  it("小数文字列 '3.9' は 3 を返す（切り捨て）", () => {
    expect(toIntOrNull('3.9')).toBe(3);
  });

  it("'xyz' は null を返す", () => {
    expect(toIntOrNull('xyz')).toBeNull();
  });

  it('null は null を返す', () => {
    expect(toIntOrNull(null)).toBeNull();
  });
});

// ─── calcPressureDiff ────────────────────────────────────────────────────────

describe('calcPressureDiff', () => {
  it('before=200, after=210 → +10 を返す', () => {
    expect(calcPressureDiff(200, 210)).toBe(10);
  });

  it('before=210, after=200 → -10 を返す（減圧）', () => {
    expect(calcPressureDiff(210, 200)).toBe(-10);
  });

  it('before=null のとき null を返す（null 伝播）', () => {
    expect(calcPressureDiff(null, 210)).toBeNull();
  });

  it('after=null のとき null を返す（null 伝播）', () => {
    expect(calcPressureDiff(200, null)).toBeNull();
  });

  it('both null のとき null を返す', () => {
    expect(calcPressureDiff(null, null)).toBeNull();
  });

  it('before=after=0 → 0 を返す', () => {
    expect(calcPressureDiff(0, 0)).toBe(0);
  });
});
