// 証憑ヘルパーのテスト — タイム整形の桁保証と
// 「NORMAL ラップが無ければ bestLap を作らない」規律の回帰ロック

import { describe, expect, it } from 'vitest';
import type { Lap, LapDetectionResult } from '../../lib/telemetry';
import { buildAttachPayload, formatLapDelta, formatLapSeconds, lapToLapTime } from './evidence';

function lap(lapNumber: number, startTime: number, endTime: number, type: Lap['type']): Lap {
  return { lapNumber, startTime, endTime, timeSeconds: endTime - startTime, type };
}

describe('formatLapSeconds', () => {
  it('m:ss.mmm 形式（秒2桁・ミリ秒3桁ゼロ埋め）で整形する', () => {
    expect(formatLapSeconds(141.711)).toBe('2:21.711');
    expect(formatLapSeconds(61.005)).toBe('1:01.005');
    expect(formatLapSeconds(9.07)).toBe('0:09.070');
  });

  it('ミリ秒丸めで秒・分へ正しく繰り上がる', () => {
    expect(formatLapSeconds(59.9996)).toBe('1:00.000');
    expect(formatLapSeconds(119.99961)).toBe('2:00.000');
  });

  it('10分超でも LapTimeModal 互換（m+:ss.mmm）を保つ', () => {
    expect(formatLapSeconds(615.042)).toBe('10:15.042');
  });
});

describe('formatLapDelta', () => {
  it('正負の符号つき秒差を整形する', () => {
    expect(formatLapDelta(0.4123)).toBe('+0.412');
    expect(formatLapDelta(-1.2)).toBe('-1.200');
    expect(formatLapDelta(0)).toBe('+0.000');
  });
});

describe('lapToLapTime', () => {
  it('分・秒・ミリ秒へ分解し type を引き継ぐ', () => {
    const result = lapToLapTime(lap(3, 100, 241.711, 'NORMAL'));
    expect(result).toEqual({
      lapNumber: 3,
      time: '2:21.711',
      type: 'NORMAL',
      minutes: 2,
      seconds: 21,
      milliseconds: 711,
    });
  });
});

describe('buildAttachPayload', () => {
  const meta = { fileName: 'session.dtb', format: 'digispice-dtb' as const, trackId: 'suzuka-full' };

  it('NORMAL 最速を bestLap に採用し、総周回数は OUT/IN を含む', () => {
    const detection: LapDetectionResult = {
      laps: [
        lap(1, 0, 95, 'OUT'),
        lap(2, 95, 237.5, 'NORMAL'),
        lap(3, 237.5, 379.011, 'NORMAL'),
        lap(4, 379.011, 420, 'IN'),
      ],
      bestLapIndex: 2,
      crossingTimes: [95, 237.5, 379.011],
    };
    const payload = buildAttachPayload(detection, meta);
    expect(payload.bestLap).toBe('2:21.511');
    expect(payload.totalLaps).toBe(4);
    expect(payload.laps.map((l) => l.type)).toEqual(['OUT', 'NORMAL', 'NORMAL', 'IN']);
    expect(payload.evidence.fileName).toBe('session.dtb');
    expect(payload.evidence.format).toBe('digispice-dtb');
    expect(payload.evidence.trackId).toBe('suzuka-full');
    expect(payload.evidence.importedAt).toBeInstanceOf(Date);
  });

  it('NORMAL ラップが無い場合（1ラップ切り出しファイル等）は bestLap を捏造しない', () => {
    const detection: LapDetectionResult = {
      laps: [lap(1, 0, 80, 'OUT'), lap(2, 80, 141.7, 'IN')],
      bestLapIndex: null,
      crossingTimes: [80],
    };
    const payload = buildAttachPayload(detection, meta);
    expect(payload.bestLap).toBeNull();
    expect(payload.totalLaps).toBe(2);
  });

  it('trackId 不明（コース推定不能）は null のまま保持する', () => {
    const detection: LapDetectionResult = { laps: [], bestLapIndex: null, crossingTimes: [] };
    const payload = buildAttachPayload(detection, { ...meta, trackId: null });
    expect(payload.evidence.trackId).toBeNull();
  });
});
