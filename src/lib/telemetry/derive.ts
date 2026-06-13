// 派生計算 — 累積距離（Haversine）・前後G・サンプリングレート推定
// TelemetryParserTest.html プロトタイプの calcCumulativeDistance / calcLongG を
// null 安全に移植したもの（プロトタイプは「lat==0 && lon==0」を GPS 欠損の
// 番兵値にしていたが、製品コードでは null を欠損として扱う）。

import { haversineMeters } from './geo';
import type { TelemetryPoint } from './types';

/**
 * 各サンプル点までの累積走行距離（m）を返す。返り値は points と同じ長さ。
 * - 隣接2点とも GPS がある区間: Haversine 距離
 * - どちらかの GPS が欠損した区間: 平均速度 × 経過時間で積分（速度由来の推定）
 * - 時間が逆行/停止している区間: 距離 0 として扱う（防御）
 */
export function calcCumulativeDistance(points: TelemetryPoint[]): number[] {
  const dist: number[] = points.length > 0 ? [0] : [];
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dt = p1.time - p0.time;
    let d = 0;
    if (p0.lat !== null && p0.lon !== null && p1.lat !== null && p1.lon !== null) {
      d = haversineMeters({ lat: p0.lat, lon: p0.lon }, { lat: p1.lat, lon: p1.lon });
    } else if (dt > 0) {
      // GPS 欠損 — 速度（km/h → m/s）の台形積分で代替
      const avgSpeedMps = (p0.speed + p1.speed) / 2 / 3.6;
      d = avgSpeedMps * dt;
    }
    dist.push(dist[i - 1] + (Number.isFinite(d) && d >= 0 ? d : 0));
  }
  return dist;
}

/**
 * 前後加速度（G）系列を返す。返り値は points と同じ長さ。
 * 速度の時間微分（km/h → m/s 換算後 / 9.81）を、窓幅5（±2）の
 * 移動平均で平滑化する（プロトタイプと同一のパラメータ）。
 * dt <= 0 の区間は 0 を出力する。
 */
export function calcLongG(points: TelemetryPoint[]): number[] {
  if (points.length === 0) return [];
  const g: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].time - points[i - 1].time;
    if (dt > 0) {
      const dv = (points[i].speed - points[i - 1].speed) / 3.6; // km/h → m/s
      g.push(dv / dt / 9.81);
    } else {
      g.push(0);
    }
  }
  // 移動平均平滑化（窓 = ±2 の5点）
  const halfWindow = 2;
  const smoothed: number[] = [];
  for (let i = 0; i < g.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(g.length - 1, i + halfWindow); j++) {
      sum += g[j];
      count++;
    }
    smoothed.push(Math.round((sum / count) * 1000) / 1000);
  }
  return smoothed;
}

/**
 * サンプル間隔の中央値からサンプリングレート（Hz）を推定する。
 * 点数が2未満、または有効な間隔が得られない場合は null。
 * 結果は小数2桁に丸める（5Hz / 1Hz / 0.5Hz 等を想定）。
 */
export function estimateSampleRateHz(times: readonly number[]): number | null {
  if (times.length < 2) return null;
  const dts: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const dt = times[i] - times[i - 1];
    if (dt > 0 && Number.isFinite(dt)) dts.push(dt);
  }
  if (dts.length === 0) return null;
  dts.sort((a, b) => a - b);
  const median = dts[Math.floor(dts.length / 2)];
  if (median <= 0) return null;
  return Math.round((1 / median) * 100) / 100;
}
