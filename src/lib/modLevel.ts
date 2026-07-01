import { ModificationEntry, ModCategory } from '../types/vehicle';

export type ModLevel = 'NORMAL' | 'LIGHT' | 'MIDDLE' | 'FULL';

export const MOD_LEVEL_LABELS: Record<ModLevel, string> = {
  NORMAL: 'ノーマル',
  LIGHT: 'ライトチューン',
  MIDDLE: 'ミドルチューン',
  FULL: 'フルチューン',
};

const EXCLUDED_CATEGORIES: ReadonlySet<ModCategory> = new Set(['other', 'tire_wheel']);

export function getActiveCategories(modifications: ModificationEntry[]): ModCategory[] {
  const categories = new Set<ModCategory>();

  modifications.forEach((modification) => {
    if (modification.removedAt !== null) return;
    if (EXCLUDED_CATEGORIES.has(modification.category)) return;

    categories.add(modification.category);
  });

  return Array.from(categories);
}

export function estimateModLevel(modifications: ModificationEntry[]): ModLevel {
  // 暫定ルール: 現在装着中の改造カテゴリ数だけで改造度を推定する。
  const categoryCount = getActiveCategories(modifications).length;

  if (categoryCount === 0) return 'NORMAL';
  if (categoryCount <= 2) return 'LIGHT';
  if (categoryCount <= 5) return 'MIDDLE';
  return 'FULL';
}
