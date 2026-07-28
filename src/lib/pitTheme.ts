/**
 * ピットUIの配色（直射日光下で読めることだけを基準に選んだ値）
 *
 * 判定基準: 前景と背景のコントラスト比 **7:1 以上**（WCAG AAA 相当）。
 * 屋内基準の 4.5:1 では直射日光下で実効コントラストが落ちて読めなくなるため、
 * このプロジェクトでは 7:1 を合格線として扱う。
 *
 * 比率は目視で決めず、pitTheme.test.ts が全ペアを計算して検証する。
 * ここに無い色をピット動線の画面で使わないこと。薄い罫線は「読めない」ではなく
 * 「境界が見えない＝押す場所が分からない」に直結する。
 */

/** Tailwind の実RGB値。コントラスト検証（pitTheme.test.ts）で参照する */
export const PIT_RGB = {
  white: [255, 255, 255],
  'gray-50': [249, 250, 251],
  'gray-200': [229, 231, 235],
  'gray-700': [55, 65, 81],
  'gray-900': [17, 24, 39],
  'blue-200': [191, 219, 254],
  'blue-800': [30, 64, 175],
  'green-300': [134, 239, 172],
  'green-800': [22, 101, 52],
  'orange-200': [254, 215, 170],
  'orange-800': [154, 52, 18],
} as const satisfies Record<string, readonly [number, number, number]>;

export type PitColorName = keyof typeof PIT_RGB;

/**
 * 使ってよい前景色と、その前景色が置かれる背景色の対応。
 * ライト面の背景は白、ダーク面の背景は gray-700 に統一している。
 * テストはこの表の全ペアが 7:1 以上であることを検証する。
 */
export const PIT_CONTRAST_PAIRS: readonly (readonly [PitColorName, PitColorName])[] = [
  // ライト面（背景: 白）
  ['gray-900', 'white'],   // 本文
  ['gray-700', 'white'],   // 補助文字・罫線
  ['blue-800', 'white'],   // 強調・主要アクションの背景（白文字側は下段で検証）
  ['green-800', 'white'],  // 目標範囲内
  ['orange-800', 'white'], // 目標範囲外・警告
  ['white', 'blue-800'],   // 主要アクション上の白文字
  ['white', 'gray-700'],   // 押せない状態の白文字
  // ダーク面（背景: gray-700）
  ['gray-50', 'gray-700'],
  ['gray-200', 'gray-700'],
  ['blue-200', 'gray-700'],
  ['green-300', 'gray-700'],
  ['orange-200', 'gray-700'],
] as const;

/** 合格線。屋内基準の 4.5 ではなく、直射日光を見込んで 7 を採る */
export const PIT_MIN_CONTRAST = 7;

/** 相対輝度（WCAG 2.x の定義） */
export function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** コントラスト比（WCAG 2.x の定義）。順序は問わない */
export function contrastRatio(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Tailwind クラス。すべて上表で 7:1 以上を確認済みの色だけで構成する。
 *
 * 使ってはいけない色（検算値）:
 * - gray-500 / 白 = 4.83:1
 * - gray-400 / 白 = 2.54:1
 * - orange-300 / gray-700 = 6.11:1
 * - blue-300 / gray-700 = 5.72:1
 */
export const PIT = {
  /** 本文 */
  text: 'text-gray-900 dark:text-gray-50',
  /** 補助文字。これ以上は薄くしない */
  sub: 'text-gray-700 dark:text-gray-200',
  /** 罫線・境界 */
  border: 'border-gray-700 dark:border-gray-200',
  /** 目標範囲内 */
  ok: 'text-green-800 dark:text-green-300',
  /** 目標範囲外・注意 */
  warn: 'text-orange-800 dark:text-orange-200',
  /** 強調（リンク・引き継ぎ提示など） */
  accent: 'text-blue-800 dark:text-blue-200',
  /** 主要アクションの背景（文字は白） */
  primaryBg: 'bg-blue-800',
  primaryActive: 'active:bg-blue-900',
  /** 押せない状態の背景（白文字で 10.3:1） */
  disabledBg: 'bg-gray-700',
  /** 面の背景 */
  surface: 'bg-white dark:bg-gray-700',
  surfaceActive: 'active:bg-gray-200 dark:active:bg-gray-600',
} as const;

/** タップターゲットの最小寸法(px)。グローブ着用のため 44 ではなく 60 を下限にする */
export const PIT_MIN_TARGET = 60;

/** テンキーのキー高。押し損ねが出たため下限より一段大きく取る */
export const PIT_KEY_HEIGHT = 64;
