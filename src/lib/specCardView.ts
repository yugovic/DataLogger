import { ModLevel } from './modLevel';
import type { PublicVehicleProfile } from './vehicleProfilePublic';
import { ModCategory, TireClass } from '../types/vehicle';

// このモジュールは lib 層（React コンポーネント外）で動くため t() を使えない。
// 表示ラベルは i18n キーに解決できる列挙値（ModLevel / TireClass / ModCategory）だけを返し、
// 実際の翻訳は表示側（SpecCard.tsx / shareImage.ts の呼び出し元）で t() する。

export interface SpecCardModificationItem {
  partName: string;
  maker: string | null;
}

export interface SpecCardModificationGroup {
  category: ModCategory;
  items: SpecCardModificationItem[];
}

export interface SpecCardSpecItem {
  key: 'powerPs' | 'weightKg';
  /** 数値＋単位（例: "120 ps"）。単位は言語非依存なので原文のまま。 */
  value: string;
}

export interface SpecCardView {
  modLevel: ModLevel;
  /** タイヤ区分の列挙値。表示側で t(`vehicle.labels.tireClass.${tireClass}`) する。 */
  tireClass: TireClass | null;
  specItems: SpecCardSpecItem[];
  modificationGroups: SpecCardModificationGroup[];
  modificationCategoryCount: number;
}

/** メーカー名として意味を持たない先頭語（大文字小文字問わず一致） */
const NON_MAKER_PREFIXES = new Set(['other', 'その他']); // i18n-ignore （表示ではなく入力値の照合用）

/** carModel を「メーカー / モデル」の二段タイポに分解する（先頭語をメーカー扱い） */
export function splitCarModel(carModel: string): { maker: string | null; model: string } {
  const trimmed = carModel.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex <= 0) return { maker: null, model: trimmed };

  const maker = trimmed.slice(0, spaceIndex);
  const model = trimmed.slice(spaceIndex + 1).trim() || trimmed;

  // 「Other」「その他」はメーカー名として無意味なので眉に表示しない
  if (NON_MAKER_PREFIXES.has(maker.toLowerCase())) {
    return { maker: null, model };
  }

  return { maker, model };
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
    items,
  }));

  const specItems: SpecCardSpecItem[] = [];
  if (profile.powerPs !== null) {
    specItems.push({ key: 'powerPs', value: `${profile.powerPs} ps` });
  }
  if (profile.weightKg !== null) {
    specItems.push({ key: 'weightKg', value: `${profile.weightKg} kg` });
  }

  const modificationCategoryCount = modificationGroups.length;

  return {
    modLevel: profile.modLevel,
    tireClass: profile.tireClass,
    specItems,
    modificationGroups,
    modificationCategoryCount,
  };
}
