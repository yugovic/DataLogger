/**
 * ピットUIの配色（直射日光下で読めることだけを基準に選んだ値）
 *
 * 判定基準: 前景と背景のコントラスト比 **7:1 以上**（WCAG AAA 相当）。
 * 屋内基準の 4.5:1 では直射日光下で実効コントラストが落ちて読めなくなるため、
 * このプロジェクトでは 7:1 を合格線として扱う。
 *
 * 計算根拠（ライト面は白 #ffffff、ダーク面は gray-700 #374151 を背景とする）:
 * - gray-900 #111827 / 白        = 17.4:1
 * - gray-700 #374151 / 白        = 10.3:1  … 罫線・補助文字の下限
 * - gray-600 #4b5563 / 白        =  7.6:1
 * - gray-500 #6b7280 / 白        =  4.6:1  … 不合格。使わない
 * - gray-400 #9ca3af / 白        =  2.4:1  … 不合格。使わない
 * - blue-800  #1e40af / 白       =  8.7:1  … 主要アクションの背景（白文字）
 * - green-800 #166534 / 白       =  7.1:1  … 目標範囲内
 * - orange-800 #9a3412 / 白      =  7.3:1  … 目標範囲外・警告
 * - gray-50   #f9fafb / gray-700 = 12.6:1
 * - gray-200  #e5e7eb / gray-700 =  8.3:1  … ダーク面の罫線・補助文字の下限
 * - green-300 #86efac / gray-700 =  7.4:1
 * - orange-200 #fed7aa / gray-700 =  7.6:1
 * - blue-200  #bfdbfe / gray-700 =  7.3:1
 * - orange-300 / gray-700        =  6.1:1  … 不合格。使わない
 * - blue-300 / gray-700          =  5.7:1  … 不合格。使わない
 *
 * ここに無い色をピット動線の画面で使わないこと。薄い罫線は「読めない」ではなく
 * 「境界が見えない＝押す場所が分からない」に直結する。
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
