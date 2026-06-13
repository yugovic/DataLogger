// 距離グリッド再サンプル — 比較コックピットの共通基盤（段階A）
//
// 2ラップはサンプル数もサンプリングレートも異なりうる（例: ラップAが 5Hz・
// ラップBが 1Hz、あるいはラインの内挿で開始時刻が周回ごとに微妙にずれる）。
// デルタT・指標差・同期カーソルのいずれも「同じ距離での値どうしを比べる」
// 必要があるため、まず各ラップを共通の距離グリッドへ線形補間で再サンプルする。
//
// 規律: ここで生成する値はすべてラップ内の実サンプル点からの線形補間であり、
// 既定値での充填は行わない（グリッド点がラップの距離範囲外なら端点で頭打ち
// = clamp し、捏造はしない）。

/** 距離軸（m）に沿った1チャンネルのサンプル列。distance は単調増加前提 */
export interface DistanceSeries {
  /** ラップ開始地点からの距離（m）。単調非減少 */
  distance: number[];
  /** distance と同じ長さの値（速度 km/h・G 等）。null は欠損（補間に使わない） */
  value: (number | null)[];
}

/**
 * 距離 d における value を線形補間で返す（distance は単調非減少前提）。
 * - d がグリッド範囲外: 端点の値で頭打ち（clamp）
 * - 補間に必要な端点が null: 有効な側の端点を返す。両端 null なら null
 * 既存点を二分探索するため O(log n)。
 */
export function interpolateAt(series: DistanceSeries, d: number): number | null {
  const { distance, value } = series;
  const n = distance.length;
  if (n === 0) return null;
  if (d <= distance[0]) return value[0];
  if (d >= distance[n - 1]) return value[n - 1];

  // distance[lo] <= d < distance[hi] となる隣接区間を二分探索
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (distance[mid] <= d) lo = mid;
    else hi = mid;
  }
  const d0 = distance[lo];
  const d1 = distance[hi];
  const v0 = value[lo];
  const v1 = value[hi];
  if (v0 === null && v1 === null) return null;
  if (v0 === null) return v1;
  if (v1 === null) return v0;
  const span = d1 - d0;
  if (span <= 0) return v0;
  const t = (d - d0) / span;
  return v0 + (v1 - v0) * t;
}

/**
 * 開始 0・終了 maxDistance を step 間隔で割った距離グリッド（m）を作る。
 * 終端 maxDistance は必ず含める（端数があっても最後に追加）。
 * step <= 0 や maxDistance <= 0 のときは [0]（または空）を返す（防御）。
 */
export function buildDistanceGrid(maxDistance: number, step: number): number[] {
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) return maxDistance === 0 ? [0] : [];
  if (!Number.isFinite(step) || step <= 0) return [0, maxDistance];
  const grid: number[] = [];
  for (let d = 0; d < maxDistance; d += step) grid.push(d);
  grid.push(maxDistance);
  return grid;
}

/**
 * 共通距離グリッド上に series を再サンプルした値配列を返す（grid と同じ長さ）。
 * 各グリッド点で interpolateAt を呼ぶ。
 */
export function resampleOnGrid(series: DistanceSeries, grid: readonly number[]): (number | null)[] {
  return grid.map((d) => interpolateAt(series, d));
}
