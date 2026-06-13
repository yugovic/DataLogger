// ラップ表示用派生計算のテスト

import { describe, expect, it } from 'vitest';
import type { Lap, TelemetryPoint } from '../../lib/telemetry';
import { calcLapMaxSpeeds, firstGpsPoint } from './lapMetrics';

const M_PER_DEG_LAT = 111320;

/** 北向きに等速直線移動する合成点列（1秒間隔、speed km/h 指定） */
function makePoints(speeds: number[]): TelemetryPoint[] {
  return speeds.map((speed, i) => ({
    time: i,
    lat: 35.0 + (i * 20) / M_PER_DEG_LAT, // 1秒あたり北へ20m
    lon: 139.5,
    speed,
    heading: null,
    altitude: null,
  }));
}

function lap(lapNumber: number, startTime: number, endTime: number, type: Lap['type']): Lap {
  return { lapNumber, startTime, endTime, timeSeconds: endTime - startTime, type };
}

describe('calcLapMaxSpeeds', () => {
  it('ラップ時間範囲ごとの最高速度を返す', () => {
    const points = makePoints([60, 80, 120, 100, 90, 140]);
    const laps = [lap(1, 0, 2, 'OUT'), lap(2, 2, 5, 'NORMAL')];
    expect(calcLapMaxSpeeds(points, laps)).toEqual([120, 140]);
  });

  it('点が無いラップは null（0 への変換禁止）', () => {
    const points = makePoints([60, 80]);
    const laps = [lap(1, 10, 20, 'NORMAL')];
    expect(calcLapMaxSpeeds(points, laps)).toEqual([null]);
  });
});

describe('firstGpsPoint', () => {
  it('GPS 欠損点をスキップして最初の有効点を返す', () => {
    const points: TelemetryPoint[] = [
      { time: 0, lat: null, lon: null, speed: 0, heading: null, altitude: null },
      { time: 1, lat: 35.1, lon: 139.6, speed: 10, heading: null, altitude: null },
    ];
    expect(firstGpsPoint(points)).toEqual({ lat: 35.1, lon: 139.6 });
    expect(firstGpsPoint([])).toBeNull();
  });
});
