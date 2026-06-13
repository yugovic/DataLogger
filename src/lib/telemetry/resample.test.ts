// 距離グリッド再サンプルのテスト — 線形補間・clamp・null 伝播・グリッド生成

import { describe, expect, it } from 'vitest';
import {
  buildDistanceGrid,
  interpolateAt,
  resampleOnGrid,
  type DistanceSeries,
} from './resample';

describe('interpolateAt', () => {
  const s: DistanceSeries = { distance: [0, 10, 20], value: [0, 100, 200] };

  it('格子点では値そのものを返す', () => {
    expect(interpolateAt(s, 0)).toBe(0);
    expect(interpolateAt(s, 10)).toBe(100);
    expect(interpolateAt(s, 20)).toBe(200);
  });

  it('区間内は線形補間する', () => {
    expect(interpolateAt(s, 5)).toBeCloseTo(50, 6);
    expect(interpolateAt(s, 15)).toBeCloseTo(150, 6);
  });

  it('範囲外は端点で clamp する（外挿しない）', () => {
    expect(interpolateAt(s, -5)).toBe(0);
    expect(interpolateAt(s, 999)).toBe(200);
  });

  it('空系列は null', () => {
    expect(interpolateAt({ distance: [], value: [] }, 5)).toBeNull();
  });

  it('片側 null の区間は有効な端点を返す（0 補填しない）', () => {
    const sn: DistanceSeries = { distance: [0, 10], value: [null, 50] };
    expect(interpolateAt(sn, 5)).toBe(50);
    const sn2: DistanceSeries = { distance: [0, 10], value: [50, null] };
    expect(interpolateAt(sn2, 5)).toBe(50);
  });

  it('両端 null の区間は null', () => {
    const sn: DistanceSeries = { distance: [0, 10], value: [null, null] };
    expect(interpolateAt(sn, 5)).toBeNull();
  });

  it('非等間隔グリッドでも正しく補間する', () => {
    const sn: DistanceSeries = { distance: [0, 3, 100], value: [0, 30, 1000] };
    expect(interpolateAt(sn, 1.5)).toBeCloseTo(15, 6);
    expect(interpolateAt(sn, 51.5)).toBeCloseTo(515, 6);
  });
});

describe('buildDistanceGrid', () => {
  it('step 間隔のグリッドを作り終端を必ず含む', () => {
    expect(buildDistanceGrid(25, 10)).toEqual([0, 10, 20, 25]);
  });

  it('割り切れる場合は終端が重複しない', () => {
    expect(buildDistanceGrid(20, 10)).toEqual([0, 10, 20]);
  });

  it('maxDistance=0 は [0]', () => {
    expect(buildDistanceGrid(0, 10)).toEqual([0]);
  });

  it('不正な step は両端のみ', () => {
    expect(buildDistanceGrid(100, 0)).toEqual([0, 100]);
  });
});

describe('resampleOnGrid', () => {
  it('グリッド各点で補間した配列を返す', () => {
    const s: DistanceSeries = { distance: [0, 100], value: [0, 100] };
    expect(resampleOnGrid(s, [0, 25, 50, 100])).toEqual([0, 25, 50, 100]);
  });
});
