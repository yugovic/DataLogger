import { describe, expect, it } from 'vitest';
import { buildTelemetryTraceFromImport, traceToLapProfile } from './persistedTrace';
import type { LapDetectionResult, TelemetrySession } from './types';
import type { CarSetup } from '../../types/setup';

function makeSession(): TelemetrySession {
  const points = Array.from({ length: 121 }, (_, i) => ({
    time: i,
    lat: 35,
    lon: 139 + i * 0.00003,
    speed: 100 + Math.sin(i / 10) * 8,
    heading: 90,
    altitude: null,
  }));
  return {
    points,
    meta: {
      format: 'aim-csv',
      sampleRateHz: 1,
      source: 'test',
      extra: {},
    },
  };
}

function makeSetup(): Pick<
  CarSetup,
  | 'carModel'
  | 'circuit'
  | 'date'
  | 'sessionType'
  | 'weather'
  | 'tireInfo'
  | 'tireSettings'
  | 'targetPressures'
  | 'sessionInfo'
  | 'notes'
> {
  return {
    carModel: 'Toyota GR86',
    circuit: '筑波サーキット',
    date: new Date('2026-06-13T10:00:00+09:00'),
    sessionType: 'practice',
    weather: {
      condition: '晴れ',
      airTemp: 24,
      trackTemp: 38,
      humidity: null,
      pressure: null,
    },
    tireInfo: { brand: 'ADVAN', compound: 'A050' },
    tireSettings: {
      fl: { before: 190, after: 220, diff: 30 },
      fr: { before: 190, after: 220, diff: 30 },
      rl: { before: 195, after: 218, diff: 23 },
      rr: { before: 195, after: 218, diff: 23 },
    },
    targetPressures: { front: 220, rear: 218 },
    sessionInfo: { distance: 20, fuel: 20 },
    notes: 'test',
  };
}

describe('persisted telemetry trace', () => {
  it('取込済みセッションから保存用の間引きトレースを生成できる', () => {
    const detection: LapDetectionResult = {
      laps: [
        { lapNumber: 1, startTime: 10, endTime: 110, timeSeconds: 100, type: 'NORMAL' },
      ],
      bestLapIndex: 0,
      crossingTimes: [10, 110],
    };

    const trace = buildTelemetryTraceFromImport({
      ownerId: 'user-1',
      setupId: 'setup-1',
      setup: makeSetup(),
      fileName: 'session.csv',
      fileSizeBytes: 1234,
      session: makeSession(),
      detection,
      trackId: 'tsukuba-2000',
      lineSource: 'db',
      stepM: 10,
    });

    expect(trace).not.toBeNull();
    expect(trace?.ownerId).toBe('user-1');
    expect(trace?.source.format).toBe('aim-csv');
    expect(trace?.lap.timeSeconds).toBe(100);
    expect(trace?.channels.distanceM.length).toBeGreaterThan(2);
    expect(trace?.channels.elapsedS.length).toBe(trace?.channels.distanceM.length);
    expect(trace?.channels.speedKmh.length).toBe(trace?.channels.distanceM.length);
    expect(trace?.path?.xM.length).toBe(trace?.channels.distanceM.length);
  });

  it('保存済みトレースを比較用 LapProfile に戻せる', () => {
    const detection: LapDetectionResult = {
      laps: [
        { lapNumber: 1, startTime: 10, endTime: 110, timeSeconds: 100, type: 'NORMAL' },
      ],
      bestLapIndex: 0,
      crossingTimes: [10, 110],
    };

    const trace = buildTelemetryTraceFromImport({
      ownerId: 'user-1',
      setupId: 'setup-1',
      setup: makeSetup(),
      fileName: 'session.csv',
      fileSizeBytes: 1234,
      session: makeSession(),
      detection,
      trackId: 'tsukuba-2000',
      lineSource: 'db',
      stepM: 10,
    });

    expect(trace).not.toBeNull();
    const profile = traceToLapProfile(trace!);
    expect(profile.distance).toEqual(trace!.channels.distanceM);
    expect(profile.elapsed).toEqual(trace!.channels.elapsedS);
    expect(profile.speed).toEqual(trace!.channels.speedKmh);
    expect(profile.lapLengthM).toBe(trace!.channels.distanceM[trace!.channels.distanceM.length - 1]);
  });
});
