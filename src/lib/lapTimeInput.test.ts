import { describe, expect, it } from 'vitest';
import { formatCompactLapTimeInput } from './lapTimeInput';

describe('formatCompactLapTimeInput', () => {
  it('123456を1分23秒456へ整形する', () => {
    expect(formatCompactLapTimeInput('123456')).toBe('1:23.456');
  });

  it('秒のみの入力と全角数字にも対応する', () => {
    expect(formatCompactLapTimeInput('58423')).toBe('0:58.423');
    expect(formatCompactLapTimeInput('１２３４５６')).toBe('1:23.456');
  });
});
