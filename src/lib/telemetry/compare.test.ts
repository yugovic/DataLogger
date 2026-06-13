// 2ラップ比較ロジックのテスト — deltaT・拡張指標・可用性・横G・区間分割
//
// すべて合成点列（実データと同じ TelemetryPoint 形状）で駆動する。

import { describe, expect, it } from 'vitest';
import {
  buildLapProfile,
  calcLatG,
  channelAvailability,
  computeLapMetrics,
  computeSegmentDeltas,
  deltaT,
  deriveCompareSeries,
  readoutAt,
  type LapProfile,
} from './compare';
import type { Lap, TelemetryPoint } from './types';

const M_PER_DEG_LAT = 111320;

function mkPoint(p: Partial<TelemetryPoint> & { time: number }): TelemetryPoint {
  return { lat: null, lon: null, speed: 0, heading: null, altitude: null, ...p };
}

function lap(lapNumber: number, startTime: number, endTime: number): Lap {
  return { lapNumber, startTime, endTime, timeSeconds: endTime - startTime, type: 'NORMAL' };
}

/**
 * 北向き直線を一定速度で進む点列を作る（GPS付き）。
 * dtSec 間隔で n 点。speedKmh は配列なら各点指定、数値なら一定。
 */
function makeStraightRun(n: number, dtSec: number, speedKmh: number | number[], startTime = 0): TelemetryPoint[] {
  const pts: TelemetryPoint[] = [];
  let northM = 0;
  for (let i = 0; i < n; i++) {
    const v = Array.isArray(speedKmh) ? speedKmh[i] : speedKmh;
    pts.push(
      mkPoint({
        time: startTime + i * dtSec,
        lat: 35.0 + northM / M_PER_DEG_LAT,
        lon: 139.5,
        speed: v,
      }),
    );
    northM += (v / 3.6) * dtSec; // 次点までの移動距離
  }
  return pts;
}

describe('channelAvailability', () => {
  it('速度のみ（GPSなし）は speed/longG のみ true、横Gや操作系は false', () => {
    const pts = [mkPoint({ time: 0, speed: 50 }), mkPoint({ time: 1, speed: 60 })];
    const a = channelAvailability(pts);
    expect(a.speed).toBe(true);
    expect(a.longG).toBe(true);
    expect(a.latG).toBe(false); // GPSなし → 横G導出不可
    expect(a.throttle).toBe(false);
    expect(a.brake).toBe(false);
    expect(a.steering).toBe(false);
    expect(a.rpm).toBe(false);
  });

  it('GPSありなら横Gも導出可能（latG=true）', () => {
    const pts = makeStraightRun(5, 1, 100);
    const a = channelAvailability(pts);
    expect(a.latG).toBe(true);
  });

  it('操作チャンネルは実データに存在しないため常に false（捏造禁止）', () => {
    const pts = makeStraightRun(10, 0.2, 120);
    const a = channelAvailability(pts);
    expect(a.throttle).toBe(false);
    expect(a.brake).toBe(false);
    expect(a.steering).toBe(false);
    expect(a.rpm).toBe(false);
  });
});

describe('calcLatG', () => {
  it('直線走行では横Gはほぼ0', () => {
    const pts = makeStraightRun(20, 0.2, 100);
    const latG = calcLatG(pts);
    expect(latG).toHaveLength(20);
    expect(Math.max(...latG.map(Math.abs))).toBeLessThan(0.05);
  });

  it('GPSが無ければ全点0（捏造しない）', () => {
    const pts = [mkPoint({ time: 0, speed: 50 }), mkPoint({ time: 1, speed: 50 })];
    expect(calcLatG(pts).every((v) => v === 0)).toBe(true);
  });

  it('円弧（右旋回）では正の横Gが出る', () => {
    // 半径 R=50m の円周上を一定速度 v で右回り（時計回り）に進む
    const R = 50;
    const v = 20; // m/s
    const dt = 0.2;
    const omega = v / R; // rad/s
    const origin = { lat: 35.0, lon: 139.5 };
    const mPerDegLon = M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
    const pts: TelemetryPoint[] = [];
    for (let i = 0; i < 30; i++) {
      // 時計回り: 角度を減らす。XY 上 x=東,y=北
      const ang = Math.PI / 2 - omega * dt * i;
      const x = R * Math.cos(ang);
      const y = R * Math.sin(ang);
      pts.push(
        mkPoint({
          time: i * dt,
          lat: origin.lat + y / M_PER_DEG_LAT,
          lon: origin.lon + x / mPerDegLon,
          speed: v * 3.6,
        }),
      );
    }
    const latG = calcLatG(pts);
    // 理論値 a = v^2/R = 400/50 = 8 m/s² → 0.815G。符号は正（右旋回）
    const mid = latG[15];
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(1.1);
  });
});

describe('buildLapProfile + deltaT', () => {
  it('B が一律に遅いとき deltaT は単調増加し finalDelta ≈ ラップタイム差', () => {
    // 同一距離（北へ約100m）を、A は 1.0s 刻みで速く、B は 1.25s 刻みで遅く走る
    // A: 100km/h 一定 / B: 80km/h 一定（距離は同じ、所要時間が B の方が長い）
    const lapA = makeStraightRun(11, 0.5, 100, 0); // 5秒・GPS距離 ~139m
    const startB = 100;
    const lapB = makeStraightRun(11, 0.625, 80, startB); // 同じ距離をゆっくり

    // セッション全体 = A の後に B
    const points = [...lapA, ...lapB];
    const der = deriveCompareSeries(points);

    const lA = lap(1, 0, lapA[lapA.length - 1].time);
    const lB = lap(2, startB, startB + lapB[lapB.length - 1].time);

    const pA = buildLapProfile(points, der.distance, der.longG, der.latG, lA);
    const pB = buildLapProfile(points, der.distance, der.longG, der.latG, lB);

    // 両ラップの距離長はほぼ等しい（同じ経路）
    expect(pA.lapLengthM).toBeGreaterThan(100);
    expect(Math.abs(pA.lapLengthM - pB.lapLengthM)).toBeLessThan(5);

    const dt = deltaT(pA, pB, 10);
    expect(dt.points.length).toBeGreaterThan(5);
    // 単調増加（B が一律に遅い → 累積差は常に増える）
    for (let i = 1; i < dt.points.length; i++) {
      expect(dt.points[i].delta).toBeGreaterThanOrEqual(dt.points[i - 1].delta - 1e-6);
    }
    // finalDelta ≈ ラップタイム差（B−A）
    const lapTimeDiff = pB.elapsed[pB.elapsed.length - 1] - pA.elapsed[pA.elapsed.length - 1];
    // 共通距離長は短い方なので厳密一致はしないが、近い
    expect(dt.finalDelta).toBeGreaterThan(0);
    expect(dt.finalDelta).toBeCloseTo(lapTimeDiff, 0);
  });

  it('同一ラップ同士の deltaT はほぼ0', () => {
    const run = makeStraightRun(21, 0.25, [
      100, 100, 100, 90, 80, 70, 60, 60, 70, 80, 90, 100, 110, 120, 120, 120, 110, 100, 100, 100, 100,
    ]);
    const der = deriveCompareSeries(run);
    const l = lap(1, 0, run[run.length - 1].time);
    const p = buildLapProfile(run, der.distance, der.longG, der.latG, l);
    const dt = deltaT(p, p, 10);
    expect(Math.abs(dt.finalDelta)).toBeLessThan(1e-6);
    expect(dt.points.every((pt) => Math.abs(pt.delta) < 1e-6)).toBe(true);
  });

  it('サンプルレートが違っても共通グリッドで吸収して比較できる', () => {
    // A は 5Hz、B は 1Hz、同じ距離を同じ所要時間で走る → deltaT ≈ 0
    const speeds = 90;
    const lapA = makeStraightRun(26, 0.2, speeds, 0); // 5秒
    const startB = 50;
    const lapB = makeStraightRun(6, 1.0, speeds, startB); // 同じ5秒・粗い
    const points = [...lapA, ...lapB];
    const der = deriveCompareSeries(points);
    const lA = lap(1, 0, lapA[lapA.length - 1].time);
    const lB = lap(2, startB, startB + lapB[lapB.length - 1].time);
    const pA = buildLapProfile(points, der.distance, der.longG, der.latG, lA);
    const pB = buildLapProfile(points, der.distance, der.longG, der.latG, lB);
    const dt = deltaT(pA, pB, 10);
    expect(dt.points.length).toBeGreaterThan(5);
    expect(Math.abs(dt.finalDelta)).toBeLessThan(0.3); // レート差由来の小さな残差のみ
  });

  it('点が足りないラップは空のデルタを返す（防御）', () => {
    const empty: LapProfile = {
      distance: [0],
      elapsed: [0],
      speed: [0],
      longG: [0],
      latG: [0],
      lapLengthM: 0,
    };
    const dt = deltaT(empty, empty, 10);
    expect(dt.points).toEqual([]);
    expect(dt.finalDelta).toBe(0);
  });
});

describe('computeLapMetrics', () => {
  it('最高速・最小速度・到達地点を実データから返す', () => {
    // 速度: 上がって下がって上がる
    const speeds = [60, 80, 120, 90, 50, 40, 60, 100, 130];
    const run = makeStraightRun(speeds.length, 0.5, speeds);
    const der = deriveCompareSeries(run);
    const l = lap(1, 0, run[run.length - 1].time);
    const p = buildLapProfile(run, der.distance, der.longG, der.latG, l);
    const m = computeLapMetrics(p, l.timeSeconds);

    expect(m.topSpeedKmh).toBe(130);
    expect(m.minCornerSpeedKmh).toBe(40);
    expect(m.topSpeedAtM).not.toBeNull();
    expect(m.slowestCornerAtM).not.toBeNull();
    // 最遅地点（40km/h, index 5）は最高速地点（index 8）より手前
    expect(m.slowestCornerAtM!).toBeLessThan(m.topSpeedAtM!);
  });

  it('スロットルCHが無いので fullThrottlePct は null（捏造禁止）', () => {
    const run = makeStraightRun(10, 0.5, 100);
    const der = deriveCompareSeries(run);
    const l = lap(1, 0, run[run.length - 1].time);
    const p = buildLapProfile(run, der.distance, der.longG, der.latG, l);
    expect(computeLapMetrics(p, l.timeSeconds).fullThrottlePct).toBeNull();
  });

  it('減速を伴うコーナーでブレーキングポイントを最遅点より手前に検出する', () => {
    // しっかり減速（120→40）してから加速
    const speeds = [120, 120, 110, 95, 75, 55, 40, 45, 60, 80, 100, 120];
    const run = makeStraightRun(speeds.length, 0.5, speeds);
    const der = deriveCompareSeries(run);
    const l = lap(1, 0, run[run.length - 1].time);
    const p = buildLapProfile(run, der.distance, der.longG, der.latG, l);
    const m = computeLapMetrics(p, l.timeSeconds);
    expect(m.brakingPointM).not.toBeNull();
    expect(m.slowestCornerAtM).not.toBeNull();
    // ブレーキ開始は最遅コーナーより手前
    expect(m.brakingPointM!).toBeLessThan(m.slowestCornerAtM!);
    // 最大減速Gは負
    expect(m.maxBrakingG).not.toBeNull();
    expect(m.maxBrakingG!).toBeLessThan(0);
  });

  it('点が無ければ全指標 null（lapTime 以外）', () => {
    const empty: LapProfile = {
      distance: [],
      elapsed: [],
      speed: [],
      longG: [],
      latG: [],
      lapLengthM: 0,
    };
    const m = computeLapMetrics(empty, 90);
    expect(m.lapTimeSeconds).toBe(90);
    expect(m.topSpeedKmh).toBeNull();
    expect(m.minCornerSpeedKmh).toBeNull();
    expect(m.brakingPointM).toBeNull();
  });
});

describe('computeSegmentDeltas', () => {
  it('3区間に分割し各区間のデルタ増分を返す（合計≈finalDelta）', () => {
    const lapA = makeStraightRun(31, 0.2, 100, 0);
    const startB = 100;
    const lapB = makeStraightRun(31, 0.22, 91, startB); // やや遅い
    const points = [...lapA, ...lapB];
    const der = deriveCompareSeries(points);
    const pA = buildLapProfile(points, der.distance, der.longG, der.latG, lap(1, 0, lapA[lapA.length - 1].time));
    const pB = buildLapProfile(
      points,
      der.distance,
      der.longG,
      der.latG,
      lap(2, startB, startB + lapB[lapB.length - 1].time),
    );
    const dt = deltaT(pA, pB, 10);
    const segs = computeSegmentDeltas(dt, 3);
    expect(segs).toHaveLength(3);
    expect(segs[0].segment).toBe(1);
    expect(segs[2].toM).toBeCloseTo(dt.commonLengthM, 6);
    const sum = segs.reduce((s, x) => s + x.delta, 0);
    expect(sum).toBeCloseTo(dt.finalDelta, 6);
  });

  it('空デルタは空配列', () => {
    expect(computeSegmentDeltas({ points: [], commonLengthM: 0, finalDelta: 0 })).toEqual([]);
  });
});

describe('readoutAt', () => {
  it('指定距離での速度を線形補間で読み出す', () => {
    const run = makeStraightRun(11, 0.5, 100);
    const der = deriveCompareSeries(run);
    const l = lap(1, 0, run[run.length - 1].time);
    const p = buildLapProfile(run, der.distance, der.longG, der.latG, l);
    const r = readoutAt(p, p.lapLengthM / 2);
    expect(r.speedKmh).toBeCloseTo(100, 0);
    expect(r.elapsedS).not.toBeNull();
  });

  it('点が無ければ全 null', () => {
    const empty: LapProfile = { distance: [], elapsed: [], speed: [], longG: [], latG: [], lapLengthM: 0 };
    const r = readoutAt(empty, 10);
    expect(r.speedKmh).toBeNull();
    expect(r.elapsedS).toBeNull();
  });
});
