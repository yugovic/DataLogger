import { describe, expect, it } from 'vitest';
import { buildShareSummary, generatePublicShareId } from './publicShareSummary';
import type { PublicVehicleProfile } from './vehicleProfilePublic';
import type { CarSetup } from '../types/setup';

const profileSnapshot: PublicVehicleProfile = {
  modifications: [{ category: 'brake', partName: 'ブレーキパッド', maker: 'ENDLESS' }],
  tireClass: 'HIGH_GRIP_RADIAL',
  powerPs: 250,
  weightKg: 1180,
  modLevel: 'LIGHT',
};

const makeSetup = (overrides: Partial<CarSetup> = {}): CarSetup => ({
  id: 'setup-1',
  userId: 'user-secret-1',
  driver: '山田太郎',
  visibility: 'private',
  anonymized: false,
  carModel: 'Honda S2000',
  vehicleId: null,
  vehicleProfileSnapshot: profileSnapshot,
  circuit: '筑波サーキット',
  date: new Date('2026-06-15T10:30:00+09:00'),
  sessionType: 'practice',
  weather: {
    condition: '晴れ',
    airTemp: 24,
    trackTemp: 36,
    humidity: null,
    pressure: null,
  },
  tireSettings: {
    fl: { before: 180, after: 220, diff: 40 },
    fr: { before: 180, after: 220, diff: 40 },
    rl: { before: 190, after: 230, diff: 40 },
    rr: { before: 190, after: 230, diff: 40 },
  },
  tireInfo: { brand: 'Yokohama', compound: 'A052' },
  sessionInfo: { distance: null, fuel: null },
  lapTimeData: {
    bestLap: '1:04.321',
    totalLaps: 12,
    evidence: null,
  },
  createdAt: new Date('2026-06-15T09:00:00+09:00'),
  updatedAt: new Date('2026-06-15T11:00:00+09:00'),
  ...overrides,
});

describe('buildShareSummary', () => {
  it('driver名・userIdをsummaryに含めないこと', () => {
    const summary = buildShareSummary(makeSetup());

    expect(summary).not.toHaveProperty('driver');
    expect(summary).not.toHaveProperty('userId');
    expect(JSON.stringify(summary)).not.toContain('山田太郎');
    expect(JSON.stringify(summary)).not.toContain('user-secret-1');
  });

  it('bestLap無しはnullのまま保存すること', () => {
    const summary = buildShareSummary(makeSetup({
      lapTimeData: { bestLap: null, totalLaps: null, evidence: null },
    }));

    expect(summary.bestLap).toBeNull();
  });

  it('vehicleProfileSnapshot無しはnullにすること', () => {
    const summary = buildShareSummary(makeSetup({ vehicleProfileSnapshot: null }));

    expect(summary.vehicleProfileSnapshot).toBeNull();
  });

  it('lapTimeData.evidenceの有無でロガー証憑を判定すること', () => {
    const withoutEvidence = buildShareSummary(makeSetup());
    const withEvidence = buildShareSummary(makeSetup({
      lapTimeData: {
        bestLap: '1:03.999',
        totalLaps: 10,
        source: 'logger',
        evidence: {
          fileName: 'session.csv',
          format: 'aim-csv',
          importedAt: new Date('2026-06-15T10:00:00+09:00'),
          trackId: 'tsukuba-2000',
        },
      },
    }));

    expect(withoutEvidence.hasLoggerEvidence).toBe(false);
    expect(withEvidence.hasLoggerEvidence).toBe(true);
  });
});

describe('generatePublicShareId', () => {
  it('推測困難な英数IDを生成すること', () => {
    const ids = Array.from({ length: 20 }, () => generatePublicShareId());

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => {
      expect(id.length).toBeGreaterThanOrEqual(12);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
      expect(id).not.toMatch(/^\d+$/);
    });
  });
});
