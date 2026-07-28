import { describe, it, expect } from 'vitest';
import {
  PIT,
  PIT_RGB,
  PIT_CONTRAST_PAIRS,
  PIT_MIN_CONTRAST,
  PIT_MIN_TARGET,
  contrastRatio,
  relativeLuminance,
} from './pitTheme';

describe('contrastRatio', () => {
  it('白と黒は 21:1', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 1);
  });

  it('同色は 1:1', () => {
    expect(contrastRatio([120, 130, 140], [120, 130, 140])).toBeCloseTo(1, 5);
  });

  it('順序を入れ替えても同じ値', () => {
    const a = [30, 64, 175] as const;
    const b = [255, 255, 255] as const;
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('相対輝度は白=1、黒=0', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });
});

describe('ピット配色は直射日光基準(7:1)を満たす', () => {
  it.each(PIT_CONTRAST_PAIRS)('%s / %s が 7:1 以上', (fg, bg) => {
    const ratio = contrastRatio(PIT_RGB[fg], PIT_RGB[bg]);
    expect(
      ratio,
      `${fg} / ${bg} = ${ratio.toFixed(2)}:1（直射日光下の合格線は ${PIT_MIN_CONTRAST}:1）`,
    ).toBeGreaterThanOrEqual(PIT_MIN_CONTRAST);
  });
});

describe('不合格と判定済みの色を前景に使っていないこと', () => {
  // 前景（文字・罫線）として使うと 7:1 を割る色。背景としての使用は
  // PIT_CONTRAST_PAIRS 側で別途検証しているのでここでは見ない。
  const BANNED_FOREGROUND = [
    'gray-400', 'gray-500', 'gray-600', 'orange-300', 'blue-300', 'blue-500', 'green-600',
  ];

  /** クラス文字列から text-/border- のユーティリティだけを取り出す（dark: 等の修飾子は落とす） */
  const foregroundTokens = (classes: string): string[] =>
    classes
      .split(/\s+/)
      .map((c) => c.split(':').pop() ?? '')
      .filter((c) => c.startsWith('text-') || c.startsWith('border-'))
      .map((c) => c.replace(/^(text|border)-/, ''));

  it.each(Object.entries(PIT))('PIT.%s の前景色が合格色だけで構成されている', (_key, value) => {
    const tokens = foregroundTokens(value);
    for (const token of tokens) {
      expect(
        BANNED_FOREGROUND,
        `前景に ${token} を使っている（7:1 未満）: "${value}"`,
      ).not.toContain(token);
    }
  });

  it('押下時の背景に置いた文字も 7:1 を保つ', () => {
    // surfaceActive の dark:active:bg-gray-600 の上には PIT.text の gray-50 が乗る
    const grayScale600 = [75, 85, 99] as const;
    expect(contrastRatio(PIT_RGB['gray-50'], grayScale600)).toBeGreaterThanOrEqual(PIT_MIN_CONTRAST);
    // ライト面の active:bg-gray-200 の上には gray-900 が乗る
    expect(contrastRatio(PIT_RGB['gray-900'], PIT_RGB['gray-200'])).toBeGreaterThanOrEqual(PIT_MIN_CONTRAST);
  });
});

describe('タップターゲットの下限', () => {
  it('グローブ前提なので WCAG の 44px より大きい', () => {
    expect(PIT_MIN_TARGET).toBeGreaterThan(44);
  });
});
