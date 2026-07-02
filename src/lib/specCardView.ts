import { MOD_LEVEL_LABELS, ModLevel } from './modLevel';
import type { PublicVehicleProfile } from './vehicleProfilePublic';
import { MOD_CATEGORY_LABELS, ModCategory, TIRE_CLASS_LABELS } from '../types/vehicle';

export interface SpecCardModificationItem {
  partName: string;
  maker: string | null;
}

export interface SpecCardModificationGroup {
  category: ModCategory;
  label: string;
  items: SpecCardModificationItem[];
}

export interface SpecCardSpecItem {
  key: 'powerPs' | 'weightKg';
  label: string;
  value: string;
  notice: '申告値';
}

export interface SpecCardView {
  modLevel: ModLevel;
  modLevelLabel: string;
  tireClassLabel: string | null;
  specItems: SpecCardSpecItem[];
  modificationGroups: SpecCardModificationGroup[];
  modificationCategoryCount: number;
  compactSummary: string;
}

/** carModel を「メーカー / モデル」の二段タイポに分解する（先頭語をメーカー扱い） */
export function splitCarModel(carModel: string): { maker: string | null; model: string } {
  const trimmed = carModel.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex <= 0) return { maker: null, model: trimmed };
  return {
    maker: trimmed.slice(0, spaceIndex),
    model: trimmed.slice(spaceIndex + 1).trim() || trimmed,
  };
}

export function buildSpecCardView(profile: PublicVehicleProfile): SpecCardView {
  const groupMap = new Map<ModCategory, SpecCardModificationItem[]>();

  profile.modifications.forEach((modification) => {
    const items = groupMap.get(modification.category) ?? [];
    items.push({
      partName: modification.partName,
      maker: modification.maker,
    });
    groupMap.set(modification.category, items);
  });

  const modificationGroups = Array.from(groupMap.entries()).map(([category, items]) => ({
    category,
    label: MOD_CATEGORY_LABELS[category],
    items,
  }));

  const specItems: SpecCardSpecItem[] = [];
  if (profile.powerPs !== null) {
    specItems.push({
      key: 'powerPs',
      label: 'パワー',
      value: `${profile.powerPs} ps`,
      notice: '申告値',
    });
  }
  if (profile.weightKg !== null) {
    specItems.push({
      key: 'weightKg',
      label: '車重',
      value: `${profile.weightKg} kg`,
      notice: '申告値',
    });
  }

  const tireClassLabel = profile.tireClass ? TIRE_CLASS_LABELS[profile.tireClass] : null;
  const modificationCategoryCount = modificationGroups.length;
  const modLevelLabel = MOD_LEVEL_LABELS[profile.modLevel];
  const compactSummary = modificationCategoryCount === 0
    ? 'ノーマル車両'
    : `${modificationCategoryCount}カテゴリ改造`;

  return {
    modLevel: profile.modLevel,
    modLevelLabel,
    tireClassLabel,
    specItems,
    modificationGroups,
    modificationCategoryCount,
    compactSummary,
  };
}
