import { describe, expect, it } from 'vitest';
import { buildSpecCardView, splitCarModel } from './specCardView';
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
      items: [
        { partName: 'ブレーキパッド', maker: 'ENDLESS' },
        { partName: 'ブレーキローター', maker: null },
      ],
    });
    expect(view.modificationGroups[1]).toMatchObject({
      category: 'suspension',
    });
  });

  it('null のパワー・車重・タイヤ区分を出力に含めないこと', () => {
    const view = buildSpecCardView(profile({
      modifications: [{ category: 'brake', partName: 'ブレーキパッド', maker: null }],
      modLevel: 'LIGHT',
    }));

    expect(view.tireClass).toBeNull();
    expect(view.specItems).toEqual([]);
    expect(view.modificationCategoryCount).toBe(1);
  });

  it('装着カテゴリ数を数えること', () => {
    const view = buildSpecCardView(profile({
      modifications: [
        { category: 'brake', partName: 'ブレーキパッド', maker: null },
        { category: 'suspension', partName: '車高調', maker: null },
        { category: 'aero', partName: 'ウイング', maker: null },
      ],
      tireClass: 'S_TIRE',
      modLevel: 'MIDDLE',
    }));

    expect(view.modificationCategoryCount).toBe(3);
    expect(view.tireClass).toBe('S_TIRE');
  });

  it('改造0件のカテゴリ数は0にすること', () => {
    const view = buildSpecCardView(profile());

    expect(view.modificationCategoryCount).toBe(0);
  });
});

describe('splitCarModel', () => {
  it('通常の「メーカー モデル」を分解すること', () => {
    expect(splitCarModel('Honda S2000')).toEqual({ maker: 'Honda', model: 'S2000' });
  });

  it('単語1つの場合はメーカーなし扱いにすること', () => {
    expect(splitCarModel('GR86')).toEqual({ maker: null, model: 'GR86' });
  });

  it('先頭語が Other の場合はメーカーを表示しないこと', () => {
    expect(splitCarModel('Other S3')).toEqual({ maker: null, model: 'S3' });
  });

  it('先頭語が その他 の場合もメーカーを表示しないこと', () => {
    expect(splitCarModel('その他 S3')).toEqual({ maker: null, model: 'S3' });
  });
});
