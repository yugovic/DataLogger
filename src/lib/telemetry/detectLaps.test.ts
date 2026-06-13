// GPS ラップ検出のテスト — 合成軌跡による交差検出・内挿精度・方向チェック・
// 最小ラップ時間ガード・GPSノイズ除去・自動ライン推定

import { describe, expect, it } from 'vitest';
import { cleanGpsPoints, detectLaps, estimateStartFinishLine } from './detectLaps';
import type { StartFinishLine, TelemetryPoint } from './types';

// 基準点（相模湾上 — DB のどのサーキットからも遠い場所）
const BASE_LAT = 35.0;
const BASE_LON = 139.5;
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos((BASE_LAT * Math.PI) / 180);

/** ローカルメートル座標 (x=東, y=北) → TelemetryPoint */
function pt(x: number, y: number, time: number, speed = 72): TelemetryPoint {
  return {
    time,
    lat: BASE_LAT + y / M_PER_DEG_LAT,
    lon: BASE_LON + x / M_PER_DEG_LON,
    speed,
    heading: null,
    altitude: null,
  };
}

/** ローカルメートル座標でラインを定義 */
function lineAt(x1: number, y1: number, x2: number, y2: number): StartFinishLine {
  return [
    { lat: BASE_LAT + y1 / M_PER_DEG_LAT, lon: BASE_LON + x1 / M_PER_DEG_LON },
    { lat: BASE_LAT + y2 / M_PER_DEG_LAT, lon: BASE_LON + x2 / M_PER_DEG_LON },
  ];
}

/**
 * 矩形コース（幅 400m × 高さ 200m、周長 1200m）を等速 20m/s で周回する
 * 合成軌跡を生成する。1周ちょうど 60 秒。
 * スタート位置は下辺の x=startX、進行方向は +x（東向き）。
 */
function rectangleLaps(laps: number, sampleHz: number, startX = 0): TelemetryPoint[] {
  const speed = 20; // m/s
  const perimeter = 1200;
  const points: TelemetryPoint[] = [];
  const dt = 1 / sampleHz;
  const total = (laps * perimeter) / speed;
  for (let t = 0; t <= total + 1e-9; t += dt) {
    const s = (startX + t * speed) % perimeter;
    let x: number;
    let y: number;
    if (s < 400) {
      x = s;
      y = 0;
    } else if (s < 600) {
      x = 400;
      y = s - 400;
    } else if (s < 1000) {
      x = 400 - (s - 600);
      y = 200;
    } else {
      x = 0;
      y = 200 - (s - 1000);
    }
    points.push(pt(x, y, t, speed * 3.6));
  }
  return points;
}

// ─── 交差検出と内挿精度 ──────────────────────────────────────────────────────

describe('detectLaps — 交差検出・内挿', () => {
  it('矩形コース3周で OUT + NORMAL×2 + IN が検出される', () => {
    // ライン: 下辺の x=210 を縦に横切る線分。スタートは x=0 なので
    // 最初の交差は 210m/20m/s = 10.5 秒後
    const points = rectangleLaps(3, 1);
    const line = lineAt(210, -20, 210, 20);
    const result = detectLaps(points, line, { minLapSeconds: 20 });

    expect(result.laps.map((l) => l.type)).toEqual(['OUT', 'NORMAL', 'NORMAL', 'IN']);
    expect(result.laps[0].timeSeconds).toBeCloseTo(10.5, 6);
    expect(result.laps[1].timeSeconds).toBeCloseTo(60, 6);
    expect(result.laps[2].timeSeconds).toBeCloseTo(60, 6);
    expect(result.laps.map((l) => l.lapNumber)).toEqual([1, 2, 3, 4]);
  });

  it('1Hz サンプリングでもサブサンプル精度の交差時刻が得られる（線形軌跡で誤差ゼロ）', () => {
    // x=210 はサンプル点 (x=200, t=10) と (x=220, t=11) の中間
    // → 線形内挿で交差時刻はちょうど 10.5 秒
    const points = rectangleLaps(1, 1);
    const line = lineAt(210, -20, 210, 20);
    const result = detectLaps(points, line, { minLapSeconds: 20 });
    expect(result.crossingTimes[0]).toBeCloseTo(10.5, 9);
  });

  it('交差時刻はサンプリングレートに依存しない（1Hz と 5Hz で一致）', () => {
    const line = lineAt(210, -20, 210, 20);
    const r1 = detectLaps(rectangleLaps(2, 1), line);
    const r5 = detectLaps(rectangleLaps(2, 5), line);
    expect(r1.crossingTimes[0]).toBeCloseTo(r5.crossingTimes[0], 6);
    expect(r1.crossingTimes[1]).toBeCloseTo(r5.crossingTimes[1], 6);
  });

  it('ライン線分の外側（延長線上）の通過は交差として数えない', () => {
    // ラインは下辺 (y=0) 周辺のみ。上辺 (y=200) の通過は延長線上 → 無視
    const points = rectangleLaps(2, 5);
    const line = lineAt(210, -20, 210, 20);
    const result = detectLaps(points, line);
    // 各周で下辺1回のみ交差（上辺通過が数えられると2倍になる）
    expect(result.crossingTimes).toHaveLength(2);
  });

  it('ベストラップは NORMAL の最速を指す', () => {
    // ライン x=0 (y∈[-20,20]) を t=0.5 / 60.5 / 110.5 / 170.5 に前進交差する軌跡
    // → NORMAL ラップは 60s / 50s / 60s。間はラインの端 (y=40) を迂回して戻る
    const detour = (tBase: number): TelemetryPoint[] => [
      pt(10, 40, tBase),
      pt(-10, 40, tBase + 2),
      pt(-10, 0, tBase + 4),
    ];
    const points: TelemetryPoint[] = [
      pt(-10, 0, 0),
      pt(10, 0, 1), // 交差 @0.5
      ...detour(3),
      pt(-10, 0, 60),
      pt(10, 0, 61), // 交差 @60.5
      ...detour(63),
      pt(-10, 0, 110),
      pt(10, 0, 111), // 交差 @110.5
      ...detour(113),
      pt(-10, 0, 170),
      pt(10, 0, 171), // 交差 @170.5
    ];
    const line = lineAt(0, -20, 0, 20);
    const result = detectLaps(points, line, { minLapSeconds: 20 });

    const normals = result.laps.filter((l) => l.type === 'NORMAL');
    expect(normals.map((l) => Math.round(l.timeSeconds))).toEqual([60, 50, 60]);
    expect(result.bestLapIndex).not.toBeNull();
    if (result.bestLapIndex === null) return;
    const best = result.laps[result.bestLapIndex];
    expect(best.type).toBe('NORMAL');
    expect(best.timeSeconds).toBeCloseTo(50, 6);
  });

  it('交差が無い軌跡ではラップなし', () => {
    const points = rectangleLaps(2, 1);
    const line = lineAt(1000, -20, 1000, 20); // コース外のライン
    const result = detectLaps(points, line);
    expect(result.laps).toEqual([]);
    expect(result.bestLapIndex).toBeNull();
  });

  it('点が2未満なら空の結果を返す', () => {
    const result = detectLaps([pt(0, 0, 0)], lineAt(0, -20, 0, 20));
    expect(result.laps).toEqual([]);
  });

  it('同一座標2点のラインはエラーになる', () => {
    const degenerate: StartFinishLine = [
      { lat: BASE_LAT, lon: BASE_LON },
      { lat: BASE_LAT, lon: BASE_LON },
    ];
    expect(() => detectLaps(rectangleLaps(1, 1), degenerate)).toThrow(/同一座標/);
  });
});

// ─── 誤検出対策 ──────────────────────────────────────────────────────────────

describe('detectLaps — 方向チェックと最小ラップ時間ガード', () => {
  it('多数派と逆方向の交差（逆走・切り返し）は除外される', () => {
    // x=0 のライン (y∈[-20,20]) を前進(+x)で3回、後退(-x)で1回横切る軌跡
    const points: TelemetryPoint[] = [
      pt(-10, 0, 0),
      pt(10, 0, 1), // 前進交差 @0.5
      pt(10, 0, 30),
      pt(-10, 0, 31), // 後退交差 @30.5 ← 除外されるべき
      pt(-10, 0, 60),
      pt(10, 0, 61), // 前進交差 @60.5
      // ラインの端を迂回して戻る（y=40 はライン線分の外）
      pt(10, 40, 63),
      pt(-10, 40, 65),
      pt(-10, 0, 67),
      pt(-10, 0, 89),
      pt(10, 0, 90), // 前進交差 @89.5
    ];
    const line = lineAt(0, -20, 0, 20);
    const result = detectLaps(points, line, { minLapSeconds: 20 });

    // 後退交差(30.5)が除外され、前進交差 0.5 / 60.5 / 89.5 のみ採用
    expect(result.crossingTimes.map((t) => Math.round(t * 10) / 10)).toEqual([0.5, 60.5, 89.5]);
    const normals = result.laps.filter((l) => l.type === 'NORMAL');
    expect(normals.map((l) => Math.round(l.timeSeconds * 10) / 10)).toEqual([60, 29]);
  });

  it('最小ラップ時間未満の再交差（ライン付近のノイズ）は破棄される', () => {
    // 前進交差 @0.5 → 端を迂回して 5 秒後に再び前進交差 @5.5（ノイズ相当）
    // → 40 秒後に正規の交差 @40.5
    const points: TelemetryPoint[] = [
      pt(-10, 0, 0),
      pt(10, 0, 1), // 交差 @0.5
      pt(10, 40, 2),
      pt(-10, 40, 3),
      pt(-10, 0, 4),
      pt(-10, 0, 5),
      pt(10, 0, 6), // 交差 @5.5 ← minLap 20s 未満 → 破棄
      pt(10, 0, 40),
      pt(10, 40, 41),
      pt(-10, 40, 42),
      pt(-10, 0, 43),
      pt(-10, 0, 49),
      pt(10, 0, 50), // 交差 @49.5
    ];
    const line = lineAt(0, -20, 0, 20);
    const result = detectLaps(points, line, { minLapSeconds: 20 });
    expect(result.crossingTimes.map((t) => Math.round(t * 10) / 10)).toEqual([0.5, 49.5]);
    expect(result.laps.filter((l) => l.type === 'NORMAL')).toHaveLength(1);
    expect(result.laps.find((l) => l.type === 'NORMAL')?.timeSeconds).toBeCloseTo(49, 1);
  });

  it('GPS 飛び（物理限界超の点）は除去され、偽の交差を作らない', () => {
    // 1周のみ、実交差は t=10.5 の1回。t=5〜6 の間（x=100→120）に
    // ライン (x=210) の先 5km へテレポートする点を注入する。
    // 除去されない場合、往路 t≈5.02 / 復路 t≈5.98 の偽交差が発生し、
    // minLapSeconds=1 では多重交差として検出されてしまう
    const points = rectangleLaps(1, 1);
    const spike = pt(5000, 0, 5.5);
    const withSpike = [...points.slice(0, 6), spike, ...points.slice(6)];
    const line = lineAt(210, -20, 210, 20);

    const result = detectLaps(withSpike, line, { minLapSeconds: 1 });
    expect(result.crossingTimes).toHaveLength(1);
    expect(result.crossingTimes[0]).toBeCloseTo(10.5, 6);
  });

  it('cleanGpsPoints は GPS 欠損・時間逆行・座標レンジ外を除去する', () => {
    const points: TelemetryPoint[] = [
      pt(0, 0, 0),
      { time: 1, lat: null, lon: null, speed: 50, heading: null, altitude: null }, // GPS欠損
      pt(20, 0, 2),
      pt(40, 0, 1.5), // 時間逆行
      { time: 3, lat: 91, lon: 139.5, speed: 50, heading: null, altitude: null }, // 緯度レンジ外
      pt(60, 0, 4),
    ];
    const clean = cleanGpsPoints(points);
    expect(clean.map((p) => p.time)).toEqual([0, 2, 4]);
  });
});

// ─── スタート/フィニッシュライン自動推定 ─────────────────────────────────────

describe('estimateStartFinishLine — 軌跡の自己回帰性からの自動推定', () => {
  it('矩形コース4周から周回ラインを推定し、正しい周期でラップが切れる', () => {
    const points = rectangleLaps(4, 5, 100);
    const line = estimateStartFinishLine(points, { minLapSeconds: 20 });
    expect(line).not.toBeNull();
    if (!line) return;

    const result = detectLaps(points, line, { minLapSeconds: 20 });
    const normals = result.laps.filter((l) => l.type === 'NORMAL');
    expect(normals.length).toBeGreaterThanOrEqual(2);
    for (const lap of normals) {
      expect(lap.timeSeconds).toBeCloseTo(60, 1);
    }
  });

  it('周回しない一方通行の軌跡では null を返す', () => {
    // 直線を 100 秒走るだけの軌跡（自己回帰なし）
    const points: TelemetryPoint[] = [];
    for (let t = 0; t <= 100; t++) points.push(pt(t * 20, 0, t));
    expect(estimateStartFinishLine(points)).toBeNull();
  });

  it('点数が少なすぎる軌跡では null を返す', () => {
    expect(estimateStartFinishLine(rectangleLaps(1, 1).slice(0, 10))).toBeNull();
  });

  it('GPS が全て欠損したセッションでは null を返す', () => {
    const points: TelemetryPoint[] = [];
    for (let t = 0; t <= 100; t++) {
      points.push({ time: t, lat: null, lon: null, speed: 100, heading: null, altitude: null });
    }
    expect(estimateStartFinishLine(points)).toBeNull();
  });
});
