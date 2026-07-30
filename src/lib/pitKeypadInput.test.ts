import { describe, it, expect } from 'vitest';
import {
  appendDigit,
  backspace,
  formatLapDigits,
  isValidLapDigits,
  lapStringToDigits,
  pressureDigitsToValue,
} from './pitKeypadInput';

describe('appendDigit', () => {
  it('数字を右に足す', () => {
    expect(appendDigit('', '2', 3)).toBe('2');
    expect(appendDigit('21', '5', 3)).toBe('215');
  });

  it('上限桁数を超えたら無視する', () => {
    expect(appendDigit('215', '9', 3)).toBe('215');
  });

  it('数字以外は無視する', () => {
    expect(appendDigit('21', 'a', 3)).toBe('21');
    expect(appendDigit('21', '', 3)).toBe('21');
  });

  it('先頭の 0 は詰めない', () => {
    expect(appendDigit('', '0', 3)).toBe('');
    expect(appendDigit('1', '0', 3)).toBe('10');
  });
});

describe('backspace', () => {
  it('末尾を1文字消す', () => {
    expect(backspace('215')).toBe('21');
    expect(backspace('2')).toBe('');
    expect(backspace('')).toBe('');
  });
});

describe('formatLapDigits', () => {
  it('6桁は m:ss.mmm', () => {
    expect(formatLapDigits('158423')).toBe('1:58.423');
  });

  it('5桁は ss.mmm（分なし）', () => {
    expect(formatLapDigits('58423')).toBe('58.423');
  });

  it('4桁は s.mmm', () => {
    expect(formatLapDigits('9423')).toBe('9.423');
  });

  it('入力途中でも壊れない', () => {
    expect(formatLapDigits('4')).toBe('0.004');
    expect(formatLapDigits('42')).toBe('0.042');
    expect(formatLapDigits('423')).toBe('0.423');
  });

  it('未入力は空文字', () => {
    expect(formatLapDigits('')).toBe('');
  });

  it('10分超も表現できる', () => {
    expect(formatLapDigits('1258423')).toBe('12:58.423');
  });
});

describe('isValidLapDigits', () => {
  it('4桁以上で秒が60未満なら有効', () => {
    expect(isValidLapDigits('158423')).toBe(true);
    expect(isValidLapDigits('9423')).toBe(true);
  });

  it('3桁以下は無効（打ち途中）', () => {
    expect(isValidLapDigits('423')).toBe(false);
    expect(isValidLapDigits('')).toBe(false);
  });

  it('秒が60以上は打ち間違いとして無効', () => {
    expect(isValidLapDigits('160423')).toBe(false);
    expect(isValidLapDigits('199999')).toBe(false);
  });
});

describe('lapStringToDigits', () => {
  it('m:ss.mmm を数字列に戻す', () => {
    expect(lapStringToDigits('1:58.423')).toBe('158423');
  });

  it('分なしも戻せる', () => {
    expect(lapStringToDigits('58.423')).toBe('58423');
  });

  it('ミリ秒が3桁未満なら右を0で埋める', () => {
    expect(lapStringToDigits('1:58.4')).toBe('158400');
  });

  it('解釈できない文字列は空文字', () => {
    expect(lapStringToDigits('あ')).toBe('');
    expect(lapStringToDigits('')).toBe('');
    expect(lapStringToDigits('1:58')).toBe('');
  });

  it('往復して同じ表示になる', () => {
    const s = '2:03.987';
    expect(formatLapDigits(lapStringToDigits(s))).toBe(s);
  });
});

describe('pressureDigitsToValue', () => {
  it('常用域の値はそのまま返す', () => {
    expect(pressureDigitsToValue('215')).toBe(215);
    expect(pressureDigitsToValue('50')).toBe(50);
    expect(pressureDigitsToValue('400')).toBe(400);
  });

  it('範囲外は打ち間違いとして null', () => {
    expect(pressureDigitsToValue('49')).toBeNull();
    expect(pressureDigitsToValue('401')).toBeNull();
    expect(pressureDigitsToValue('9')).toBeNull();
  });

  it('未入力は null（0 にしない）', () => {
    expect(pressureDigitsToValue('')).toBeNull();
  });
});
