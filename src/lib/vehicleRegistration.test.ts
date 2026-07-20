import { describe, expect, it } from 'vitest';
import type { CarSetup } from '../types/setup';
import type { Vehicle } from '../types/vehicle';
import {
  buildVehicleCandidates,
  findVehicleByCarModel,
  normalizeVehicleName,
  splitCarModel,
} from './vehicleRegistration';

const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 'vehicle-1',
  userId: 'user-1',
  make: 'Toyota',
  model: 'GR86',
  year: 2024,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const setup = (carModel: string): CarSetup => ({
  userId: 'user-1',
  driver: null,
  carModel,
  circuit: '鈴鹿サーキット',
  date: new Date('2024-01-01'),
  sessionType: 'practice',
  weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null },
  tireSettings: {
    fl: { before: null, after: null },
    fr: { before: null, after: null },
    rl: { before: null, after: null },
    rr: { before: null, after: null },
  },
  tireInfo: { brand: '', compound: '' },
  sessionInfo: { distance: null, fuel: null },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

describe('vehicleRegistration', () => {
  it('空白と大文字小文字を正規化して既存車両を見つける', () => {
    expect(normalizeVehicleName(' Toyota   GR86 ')).toBe('toyota gr86');
    expect(findVehicleByCarModel([vehicle()], 'toyota  gr86')?.id).toBe('vehicle-1');
  });

  it('車種文字列をメーカーとモデルへ分割する', () => {
    expect(splitCarModel('Nissan Fairlady Z Z34 / amuse')).toEqual({
      name: 'Nissan Fairlady Z Z34 / amuse',
      make: 'Nissan',
      model: 'Fairlady Z Z34 / amuse',
    });
  });

  it('履歴の未登録車種だけを重複なく候補化する', () => {
    const candidates = buildVehicleCandidates(
      [setup('Toyota GR86'), setup('Honda S2000'), setup('Honda   S2000')],
      [vehicle()],
    );
    expect(candidates).toEqual([{ name: 'Honda S2000', make: 'Honda', model: 'S2000' }]);
  });

  it('削除済みの非アクティブ車両を再登録候補にしない', () => {
    const candidates = buildVehicleCandidates(
      [setup('Toyota GR86')],
      [vehicle({ isActive: false })],
    );
    expect(candidates).toEqual([]);
  });
});
