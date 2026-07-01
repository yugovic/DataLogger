import { describe, expect, it } from 'vitest';
import { toPublicVehicleProfile } from './vehicleProfilePublic';
import type { ModCategory, ModificationEntry, VehicleProfile } from '../types/vehicle';

let nextModificationId = 0;

const makeModification = (
  category: ModCategory,
  overrides: Partial<ModificationEntry> = {},
): ModificationEntry => ({
  id: `mod-${nextModificationId += 1}`,
  category,
  partName: 'テストパーツ',
  maker: 'テストメーカー',
  installedAt: new Date('2026-01-01T00:00:00'),
  removedAt: null,
  costJPY: 120000,
  memo: '公開しないメモ',
  ...overrides,
});

const makeProfile = (modifications: ModificationEntry[]): VehicleProfile => ({
  modifications,
  tireClass: null,
  powerPs: null,
  weightKg: null,
});

describe('toPublicVehicleProfile', () => {
  it('costJPY / memo / installedAt / removedAt を出力に含めないこと', () => {
    const profile = makeProfile([makeModification('brake')]);
    const publicProfile = toPublicVehicleProfile(profile);
    const publicModification = publicProfile.modifications[0];

    expect(publicModification).toEqual({
      category: 'brake',
      partName: 'テストパーツ',
      maker: 'テストメーカー',
    });
    expect(publicModification).not.toHaveProperty('costJPY');
    expect(publicModification).not.toHaveProperty('memo');
    expect(publicModification).not.toHaveProperty('installedAt');
    expect(publicModification).not.toHaveProperty('removedAt');
  });

  it('removedAt 付きエントリを除外すること', () => {
    const profile = makeProfile([
      makeModification('brake'),
      makeModification('suspension', { removedAt: new Date('2026-02-01T00:00:00') }),
    ]);

    const publicProfile = toPublicVehicleProfile(profile);

    expect(publicProfile.modifications).toHaveLength(1);
    expect(publicProfile.modifications[0].category).toBe('brake');
  });

  it('modLevel を付与すること', () => {
    const profile = makeProfile([
      makeModification('brake'),
      makeModification('suspension'),
      makeModification('aero'),
    ]);

    const publicProfile = toPublicVehicleProfile(profile);

    expect(publicProfile.modLevel).toBe('MIDDLE');
  });
});
