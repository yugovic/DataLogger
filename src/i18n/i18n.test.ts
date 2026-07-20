import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber } from './formatters';
import { normalizeLocale } from './locale';
import { resources } from './resources';

const leafKeys = (value: unknown, prefix = ''): string[] => {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
};

describe('locale normalization', () => {
  it.each([
    ['ja', 'ja-JP'],
    ['ja-JP', 'ja-JP'],
    ['ja_JP', 'ja-JP'],
    ['en', 'en'],
    ['en-US', 'en'],
    ['fr-FR', null],
    [null, null],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });
});

describe('translation resources', () => {
  it('keeps Japanese and English key sets aligned', () => {
    expect(leafKeys(resources.en).sort()).toEqual(leafKeys(resources['ja-JP']).sort());
  });
});

describe('locale formatters', () => {
  it('formats dates for the selected locale', () => {
    const date = new Date(2026, 6, 19, 12, 0, 0);
    expect(formatDate(date, 'ja-JP')).toContain('2026');
    expect(formatDate(date, 'en')).toContain('2026');
  });

  it('formats numbers and JPY without changing stored values', () => {
    expect(formatNumber(12345.6, 'en')).toBe('12,345.6');
    expect(formatCurrency(2500, 'ja-JP', 'JPY')).toContain('2,500');
  });
});

