// 派生計算（累積距離・前後G・サンプリングレート推定）のテスト

import { describe, expect, it } from 'vitest';
import { calcCumulativeDistance, calcLongG, estimateSampleRateHz } from './derive';
import { haversineMeters } from './geo';
import type { TelemetryPoint } from './types';

function mkPoint(partial: Partial<TelemetryPoint> & { time: number }): TelemetryPoint {
  return { lat: null, lon: null, speed: 0, heading: null, altitude: null, ...partial };
}

describe('haversineMeters', () => {
  it('緯度 0.001° の距離は約 111.2 m', () => {
    const d = haversineMeters({ lat: 35.0, lon: 139.0 }, { lat: 35.001, lon: 139.0 });
    expect(d).toBeCloseTo(111.19, 1);
  });

  it('同一点の距離は 0', () => {
    expect(haversineMeters({ lat: 35, lon: 139 }, { lat: 35, lon: 139 })).toBe(0);
  });
});

describe('calcCumulativeDistance', () => {
  it('GPS 区間は Haversine 距離で積算する', () => {
    const points = [
      mkPoint({ time: 0, lat: 35.0, lon: 139.0, speed: 100 }),
      mkPoint({ time: 1, lat: 35.001, lon: 139.0, speed: 100 }),
      mkPoint({ time: 2, lat: 35.002, lon: 139.0, speed: 100 }),
    ];
    const dist = calcCumulativeDistance(points);
    expect(dist).toHaveLength(3);
    expect(dist[0]).toBe(0);
    expect(dist[1]).toBeCloseTo(111.19, 1);
    expect(dist[2]).toBeCloseTo(222.39, 1);
  });

  it('GPS 欠損区間は速度の台形積分で補完する', () => {
    // 90 km/h = 25 m/s で 2 秒 → 50 m
    const points = [
      mkPoint({ time: 0, speed: 90 }),
      mkPoint({ time: 2, speed: 90 }),
    ];
    const dist = calcCumulativeDistance(points);
    expect(dist[1]).toBeCloseTo(50, 6);
  });

  it('GPS 有無が混在しても積算が継続する', () => {
    const points = [
      mkPoint({ time: 0, lat: 35.0, lon: 139.0, speed: 90 }),
      mkPoint({ time: 1, speed: 90 }), // GPS 欠損 → 25m
      mkPoint({ time: 2, lat: 35.001, lon: 139.0, speed: 90 }), // 欠損ペア → 25m
    ];
    const dist = calcCumulativeDistance(points);
    expect(dist[2]).toBeCloseTo(50, 6);
  });

  it('空配列は空配列を返す', () => {
    expect(calcCumulativeDistance([])).toEqual([]);
  });
});

describe('calcLongG', () => {
  it('一定加速度（0→100km/h を 10 秒）はおよそ +0.28G になる', () => {
    // dv/dt = (100/3.6)/10 = 2.78 m/s² → 0.283 G
    const points: TelemetryPoint[] = [];
    for (let t = 0; t <= 10; t++) {
      points.push(mkPoint({ time: t, speed: t * 10 }));
    }
    const g = calcLongG(points);
    expect(g).toHaveLength(11);
    // 中間部（平滑窓の影響が無い領域）で理論値と一致
    expect(g[5]).toBeCloseTo(2.78 / 9.81, 2);
  });

  it('減速は負の G になる', () => {
    const points = [
      mkPoint({ time: 0, speed: 100 }),
      mkPoint({ time: 1, speed: 80 }),
      mkPoint({ time: 2, speed: 60 }),
      mkPoint({ time: 3, speed: 40 }),
      mkPoint({ time: 4, speed: 20 }),
    ];
    const g = calcLongG(points);
    expect(g[2]).toBeLessThan(-0.4);
  });

  it('dt<=0 の区間は 0 として扱う（ゼロ除算防御）', () => {
    const points = [
      mkPoint({ time: 0, speed: 0 }),
      mkPoint({ time: 0, speed: 100 }),
      mkPoint({ time: 1, speed: 100 }),
    ];
    const g = calcLongG(points);
    expect(g.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('空配列は空配列を返す', () => {
    expect(calcLongG([])).toEqual([]);
  });
});

describe('estimateSampleRateHz', () => {
  it('0.2 秒間隔 → 5 Hz', () => {
    expect(estimateSampleRateHz([0, 0.2, 0.4, 0.6])).toBe(5);
  });

  it('1 秒間隔 → 1 Hz', () => {
    expect(estimateSampleRateHz([0, 1, 2, 3])).toBe(1);
  });

  it('不規則な間隔は中央値で推定する（外れ値に頑健）', () => {
    expect(estimateSampleRateHz([0, 1, 2, 3, 60])).toBe(1);
  });

  it('点数不足や無効な時刻列は null', () => {
    expect(estimateSampleRateHz([])).toBeNull();
    expect(estimateSampleRateHz([1])).toBeNull();
    expect(estimateSampleRateHz([1, 1])).toBeNull();
  });
});
