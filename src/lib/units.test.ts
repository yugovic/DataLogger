import { describe, it, expect } from 'vitest';
import {
  toNumberOrNull,
  toIntOrNull,
  calcPressureDiff,
  kpaToPsi,
  psiToKpa,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  pressureToDisplay,
  pressureToNormalized,
  temperatureToDisplay,
  temperatureToNormalized,
  formatPressure,
  formatTemperature,
} from './units';

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

// ─── kPa ⇔ psi ─────────────────────────────────────────────────────────────

describe('kpaToPsi / psiToKpa', () => {
  it('1 psi = 6.894757 kPa の変換係数を使う', () => {
    expect(psiToKpa(1)).toBeCloseTo(6.894757, 6);
  });

  it('200 kPa → psi → kPa の往復変換で誤差が実用上無視できる', () => {
    const roundTripped = psiToKpa(kpaToPsi(200));
    expect(roundTripped).toBeCloseTo(200, 9);
  });

  it('0 kPa は 0 psi（0→null 変換をしない）', () => {
    expect(kpaToPsi(0)).toBe(0);
  });

  it('負の値もそのまま変換する', () => {
    expect(kpaToPsi(-6.894757)).toBeCloseTo(-1, 6);
  });
});

// ─── ℃ ⇔ °F ────────────────────────────────────────────────────────────────

describe('celsiusToFahrenheit / fahrenheitToCelsius', () => {
  it('0℃ → 32°F', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it('100℃ → 212°F', () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it('℃ → °F → ℃ の往復変換で誤差が実用上無視できる', () => {
    const roundTripped = fahrenheitToCelsius(celsiusToFahrenheit(23.4));
    expect(roundTripped).toBeCloseTo(23.4, 9);
  });

  it('氷点下も変換できる（-40℃ = -40°F）', () => {
    expect(celsiusToFahrenheit(-40)).toBeCloseTo(-40, 9);
  });
});

// ─── 表示境界の変換ヘルパー（null 伝播・0 の扱い） ──────────────────────────

describe('pressureToDisplay / pressureToNormalized', () => {
  it('null は null のまま（0 に変換しない）', () => {
    expect(pressureToDisplay(null, 'psi')).toBeNull();
    expect(pressureToNormalized(null, 'psi')).toBeNull();
  });

  it('0 kPa は 0 のまま（null に変換しない）', () => {
    expect(pressureToDisplay(0, 'psi')).toBe(0);
  });

  it('kPa 単位選択時は無変換', () => {
    expect(pressureToDisplay(200, 'kPa')).toBe(200);
    expect(pressureToNormalized(200, 'kPa')).toBe(200);
  });

  it('表示→正規化の往復で元の kPa 値に戻る', () => {
    const displayed = pressureToDisplay(200, 'psi');
    const normalized = pressureToNormalized(displayed, 'psi');
    expect(normalized).toBeCloseTo(200, 9);
  });
});

describe('temperatureToDisplay / temperatureToNormalized', () => {
  it('null は null のまま', () => {
    expect(temperatureToDisplay(null, 'F')).toBeNull();
    expect(temperatureToNormalized(null, 'F')).toBeNull();
  });

  it('0℃ は 0 のまま（℃単位選択時、null に変換しない）', () => {
    expect(temperatureToDisplay(0, 'C')).toBe(0);
  });

  it('0℃ → 32°F 表示、往復で 0℃ に戻る', () => {
    const displayed = temperatureToDisplay(0, 'F');
    expect(displayed).toBe(32);
    expect(temperatureToNormalized(displayed, 'F')).toBeCloseTo(0, 9);
  });
});

// ─── フォーマット関数（丸め・null 表示） ────────────────────────────────────

describe('formatPressure', () => {
  it('null は「—」を返す', () => {
    expect(formatPressure(null, 'kPa')).toBe('—');
  });

  it('kPa 表示は小数1桁 + 単位ラベル', () => {
    expect(formatPressure(200, 'kPa')).toBe('200.0 kPa');
  });

  it('psi 表示は変換して小数1桁 + 単位ラベル', () => {
    expect(formatPressure(206.8427, 'psi')).toBe('30.0 psi');
  });

  it('0 kPa は「0.0 kPa」（—にしない）', () => {
    expect(formatPressure(0, 'kPa')).toBe('0.0 kPa');
  });
});

describe('formatTemperature', () => {
  it('null は「—」を返す', () => {
    expect(formatTemperature(null, 'C')).toBe('—');
  });

  it('℃ 表示は小数1桁 + ℃', () => {
    expect(formatTemperature(23, 'C')).toBe('23.0 ℃');
  });

  it('°F 表示は変換して小数1桁 + °F', () => {
    expect(formatTemperature(0, 'F')).toBe('32.0 °F');
  });
});
