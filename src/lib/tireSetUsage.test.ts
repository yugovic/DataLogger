import { describe, expect, it } from 'vitest';
import type { CarSetup } from '../types/setup';
import type { TireSet } from '../types/tire';
import { calculateTireSetUsage } from './tireSetUsage';

const tireSet: TireSet = {
  id: 'set-a', userId: 'user', code: 'A050-01', manufacturer: '横浜ゴム', productName: 'ADVAN A050',
  compound: 'M', frontSize: '205/50R15', rearSize: '205/50R15', primaryVehicleId: 'vehicle',
  status: 'active', startedAt: null, initialDistanceKm: 20, initialLaps: 5, initialHeatCycles: 1,
  notes: '', createdAt: new Date(), updatedAt: new Date(),
};

const setup = (id: string, tireSetId: string, distance: number | null, laps: number | null, cycles: number): CarSetup => ({
  id, userId: 'user', driver: null, carModel: 'Car', circuit: 'Track', date: new Date(), sessionType: 'practice',
  weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null },
  tireSettings: {
    fl: { before: null, after: null }, fr: { before: null, after: null },
    rl: { before: null, after: null }, rr: { before: null, after: null },
  },
  tireInfo: { brand: '横浜ゴム', compound: 'M', tireSetId },
  tireUsage: { heatCyclesAdded: cycles },
  sessionInfo: { distance, fuel: null },
  lapTimeData: { totalLaps: laps }, createdAt: new Date(), updatedAt: new Date(),
});

describe('calculateTireSetUsage', () => {
  it('初期値と該当セットの走行記録だけを合算する', () => {
    const result = calculateTireSetUsage(tireSet, [
      setup('1', 'set-a', 40, 12, 1),
      setup('2', 'set-a', 30, 8, 2),
      setup('3', 'set-b', 999, 999, 9),
    ]);
    expect(result).toEqual({ distanceKm: 90, laps: 25, heatCycles: 4, sessionCount: 2 });
  });
});
