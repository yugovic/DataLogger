/**
 * ピット用テンキーの入力ロジック（純粋関数）
 *
 * ラップタイムは OS の記号キーボードに切り替えて "1:58.423" と打たせると
 * キーボード出現待ち＋切替＋8文字で10タップ近くかかる。ここでは数字だけを
 * 左から詰めて打たせ、表示側で m:ss.mmm に整形する（6タップで確定）。
 *
 * 未入力は空文字のまま返す。0 埋めはしない（データ品質方針）。
 */

/** 数字だけの文字列に1文字追加する。maxDigits を超える入力は無視する */
export function appendDigit(digits: string, d: string, maxDigits: number): string {
  if (!/^[0-9]$/.test(d)) return digits;
  if (digits.length >= maxDigits) return digits;
  // 先頭の 0 は意味がないので詰めない（"0" 単独入力も作らない）
  if (digits === '' && d === '0') return digits;
  return digits + d;
}

/** 1文字削除 */
export function backspace(digits: string): string {
  return digits.slice(0, -1);
}

/**
 * 数字列をラップタイム表示へ整形する（右詰め: 最後の3桁=ミリ秒、その前2桁=秒、残り=分）。
 *
 * 例: "158423" → "1:58.423" / "58423" → "58.423" / "423" → "0.423"
 * 入力途中でも壊れないよう、桁が足りないときは分・秒を省いた形で返す。
 */
export function formatLapDigits(digits: string): string {
  if (digits === '') return '';
  const padded = digits.padStart(4, '0');
  const ms = padded.slice(-3);
  const rest = padded.slice(0, -3);
  const sec = rest.slice(-2);
  const min = rest.slice(0, -2);
  if (min === '') return `${parseInt(sec, 10)}.${ms}`;
  return `${parseInt(min, 10)}:${sec.padStart(2, '0')}.${ms}`;
}

/**
 * ラップタイムとして成立しているか（保存してよいか）。
 * 秒が60以上のものは打ち間違いとして弾く。
 */
export function isValidLapDigits(digits: string): boolean {
  if (digits.length < 4) return false;
  const padded = digits.padStart(4, '0');
  const sec = parseInt(padded.slice(-5, -3), 10);
  return Number.isFinite(sec) && sec < 60;
}

/**
 * 既存の "1:58.423" 形式の文字列を数字列へ戻す（編集再開用）。
 * 解釈できない文字列は空文字にする（誤った値を持ち回らない）。
 */
export function lapStringToDigits(value: string): string {
  const m = value.trim().match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,3})$/);
  if (!m) return '';
  const [, min, sec, ms] = m;
  const minPart = min ? String(parseInt(min, 10)) : '';
  return `${minPart}${sec.padStart(2, '0')}${ms.padEnd(3, '0')}`.replace(/^0+(?=\d{5})/, '');
}

/**
 * 空気圧の数字入力を kPa 値へ。実在しない範囲は打ち間違いとして扱い null を返す。
 * 競技用タイヤの常用域を大きく外れる値を保存させない。
 */
export function pressureDigitsToValue(digits: string, min = 50, max = 400): number | null {
  if (digits === '') return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}
