import { describe, expect, it } from 'vitest';
import { buildSpecCardView } from './specCardView';
import type { PublicVehicleProfile } from './vehicleProfilePublic';

const profile = (overrides: Partial<PublicVehicleProfile> = {}): PublicVehicleProfile => ({
  modifications: [],
  tireClass: null,
  powerPs: null,
  weightKg: null,
  modLevel: 'NORMAL',
  ...overrides,
});

describe('buildSpecCardView', () => {
  it('改造リストをカテゴリごとにグループ化すること', () => {
    const view = buildSpecCardView(profile({
      modifications: [
        { category: 'brake', partName: 'ブレーキパッド', maker: 'ENDLESS' },
        { category: 'brake', partName: 'ブレーキローター', maker: null },
        { category: 'suspension', partName: '車高調', maker: 'TEIN' },
      ],
      modLevel: 'LIGHT',
    }));

    expect(view.modificationGroups).toHaveLength(2);
    expect(view.modificationGroups[0]).toMatchObject({
      category: 'brake',
      label: 'ブレーキ',
      items: [
        { partName: 'ブレーキパッド', maker: 'ENDLESS' },
        { partName: 'ブレーキローター', maker: null },
      ],
    });
    expect(view.modificationGroups[1]).toMatchObject({
      category: 'suspension',
      label: '足回り',
    });
  });

  it('null のパワー・車重・タイヤ区分を出力に含めないこと', () => {
    const view = buildSpecCardView(profile({
      modifications: [{ category: 'brake', partName: 'ブレーキパッド', maker: null }],
      modLevel: 'LIGHT',
    }));

    expect(view.tireClassLabel).toBeNull();
    expect(view.specItems).toEqual([]);
    expect(view.compactSummary).toBe('1カテゴリ改造');
  });

  it('compact サマリーを生成すること', () => {
    const view = buildSpecCardView(profile({
      modifications: [
        { category: 'brake', partName: 'ブレーキパッド', maker: null },
        { category: 'suspension', partName: '車高調', maker: null },
        { category: 'aero', partName: 'ウイング', maker: null },
      ],
      tireClass: 'S_TIRE',
      modLevel: 'MIDDLE',
    }));

    expect(view.compactSummary).toBe('3カテゴリ改造');
  });

  it('改造0件の compact サマリーはノーマル車両にすること', () => {
    const view = buildSpecCardView(profile());

    expect(view.compactSummary).toBe('ノーマル車両');
  });
});
