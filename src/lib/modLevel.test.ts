import { describe, expect, it } from 'vitest';
import { estimateModLevel, getActiveCategories } from './modLevel';
import type { ModCategory, ModificationEntry } from '../types/vehicle';

let nextModificationId = 0;

const makeModification = (
  category: ModCategory,
  overrides: Partial<ModificationEntry> = {},
): ModificationEntry => ({
  id: `mod-${nextModificationId += 1}`,
  category,
  partName: 'テストパーツ',
  maker: null,
  installedAt: null,
  removedAt: null,
  costJPY: null,
  memo: null,
  ...overrides,
});

describe('estimateModLevel', () => {
  it('空配列は NORMAL を返すこと', () => {
    expect(estimateModLevel([])).toBe('NORMAL');
  });

  it('tire_wheel と other のみなら NORMAL を返すこと', () => {
    const modifications = [
      makeModification('tire_wheel'),
      makeModification('other'),
    ];

    expect(estimateModLevel(modifications)).toBe('NORMAL');
  });

  it('同一カテゴリの複数エントリは 1 カテゴリとして数えること', () => {
    const modifications = [
      makeModification('brake'),
      makeModification('brake'),
    ];

    expect(getActiveCategories(modifications)).toEqual(['brake']);
    expect(estimateModLevel(modifications)).toBe('LIGHT');
  });

  it('removedAt 付きエントリはカウント外にすること', () => {
    const modifications = [
      makeModification('brake', { removedAt: new Date('2026-01-01T00:00:00') }),
    ];

    expect(estimateModLevel(modifications)).toBe('NORMAL');
  });

  it.each([
    [['brake', 'suspension'], 'LIGHT'],
    [['brake', 'suspension', 'aero'], 'MIDDLE'],
    [['brake', 'suspension', 'aero', 'ecu', 'drivetrain'], 'MIDDLE'],
    [['brake', 'suspension', 'aero', 'ecu', 'drivetrain', 'engine_internal'], 'FULL'],
  ] as const)('ユニークカテゴリ数の境界で %s → %s を返すこと', (categories, expected) => {
    const modifications = categories.map((category) => makeModification(category));

    expect(estimateModLevel(modifications)).toBe(expected);
  });
});
