// ラップ表示用の派生計算 — 取込済みセッションからラップ単位の表示値・
// チャート系列を切り出す純ロジック（WP5）
//
// 全て実データ（パース済みテレメトリ点列）からの導出であり、
// 欠損は null / 空配列のまま返す（既定値での充填禁止）。

import { calcCumulativeDistance, calcLongG } from '../../lib/telemetry';
import { makeLocalProjection } from '../../lib/telemetry/geo';
import type { Lap, LatLon, StartFinishLine, TelemetryPoint } from '../../lib/telemetry';

/**
 * 各ラップの最高速度（km/h）。ラップ時間範囲内に点が無い場合は null。
 * points は時刻昇順前提（パーサーが保証）。
 */
export function calcLapMaxSpeeds(
  points: readonly TelemetryPoint[],
  laps: readonly Lap[],
): (number | null)[] {
  const result: (number | null)[] = laps.map(() => null);
  if (laps.length === 0) return result;
  let li = 0;
  for (const p of points) {
    while (li < laps.length && p.time > laps[li].endTime) li++;
    if (li >= laps.length) break;
    if (p.time >= laps[li].startTime) {
      const cur = result[li];
      result[li] = cur === null ? p.speed : Math.max(cur, p.speed);
    }
  }
  return result;
}

/** セッション全体の派生系列（チャート用に1回だけ計算して使い回す） */
export interface SessionDerived {
  /** 各点までの累積走行距離（m） */
  cumulativeDistanceM: number[];
  /** 前後加速度（G、平滑化済み） */
  longG: number[];
}

export function deriveSessionSeries(points: TelemetryPoint[]): SessionDerived {
  return {
    cumulativeDistanceM: calcCumulativeDistance(points),
    longG: calcLongG(points),
  };
}

/** 1ラップ分のチャート系列。x はラップ開始地点からの距離（m） */
export interface LapChartSeries {
  /** [距離m, 速度km/h] */
  speed: [number, number][];
  /** [距離m, 前後G] */
  longG: [number, number][];
}

/**
 * ラップの時間範囲 [startTime, endTime] に含まれる点を切り出し、
 * 距離軸をラップ開始基準に揃えたチャート系列を返す。
 */
export function sliceLapSeries(
  points: readonly TelemetryPoint[],
  derived: SessionDerived,
  lap: Lap,
): LapChartSeries {
  const speed: [number, number][] = [];
  const longG: [number, number][] = [];
  let baseDist: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const t = points[i].time;
    if (t < lap.startTime) continue;
    if (t > lap.endTime) break;
    if (baseDist === null) baseDist = derived.cumulativeDistanceM[i];
    const x = derived.cumulativeDistanceM[i] - baseDist;
    speed.push([x, points[i].speed]);
    longG.push([x, derived.longG[i]]);
  }
  return { speed, longG };
}

/**
 * ラップの GPS 軌跡を origin 基準の局所平面（東x/北y、m）へ投影して返す。
 * GPS 欠損点はスキップする。
 */
export function projectLapPath(
  points: readonly TelemetryPoint[],
  lap: Lap,
  origin: LatLon,
): [number, number][] {
  const { toXY } = makeLocalProjection(origin);
  const path: [number, number][] = [];
  for (const p of points) {
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    if (p.lat === null || p.lon === null) continue;
    const xy = toXY({ lat: p.lat, lon: p.lon });
    path.push([xy.x, xy.y]);
  }
  return path;
}

/** スタート/フィニッシュライン線分を局所平面へ投影する */
export function projectLine(line: StartFinishLine, origin: LatLon): [number, number][] {
  const { toXY } = makeLocalProjection(origin);
  return line.map((p) => {
    const xy = toXY(p);
    return [xy.x, xy.y] as [number, number];
  });
}

/** 軌跡投影の基準点: 最初の GPS 有効点（無ければ null） */
export function firstGpsPoint(points: readonly TelemetryPoint[]): LatLon | null {
  for (const p of points) {
    if (p.lat !== null && p.lon !== null) return { lat: p.lat, lon: p.lon };
  }
  return null;
}
