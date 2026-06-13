// ラップ表示用の派生計算 — 取込済みセッションからラップ単位の表示値・
// 軌跡投影を切り出す純ロジック（WP5 / 段階A）
//
// 全て実データ（パース済みテレメトリ点列）からの導出であり、
// 欠損は null / 空配列のまま返す（既定値での充填禁止）。
//
// 注: チャート系列の切り出し・距離リベースは段階Aで src/lib/telemetry/compare.ts
// （deltaT/buildLapProfile/resample）へ移行した。本ファイルは取込画面（TelemetryAnalysis）
// とコックピットのコースマップが使う最小限の派生のみを保持する。

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
