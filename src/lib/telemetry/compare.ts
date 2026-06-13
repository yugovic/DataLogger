// 2ラップ比較の純ロジック — デルタT・拡張指標・チャンネル可用性・区間分割（段階A）
//
// docs/telemetry-ux-strategy.md §4.2/§4.4/§4.6 の「デルタ・ファースト」を支える計算層。
// すべて実パース済みテレメトリ点列からの導出。既定値での充填は行わない
// （欠損は null、検出不能は null）。LLM 不使用・決定的。
//
// 主力ロガー（デジスパイス＝GPSベース）と NMEA は GPS＋速度のみ。
// スロットル/ブレーキ/舵角/RPM は通常存在しない（TelemetryPoint にフィールド自体が無い）。
// よって「ブレーキングポイント」は速度の減速開始点から推定する（ブレーキCHに依存しない）。

import { calcCumulativeDistance, calcLongG } from './derive';
import { makeLocalProjection } from './geo';
import { buildDistanceGrid, interpolateAt, resampleOnGrid, type DistanceSeries } from './resample';
import type { Lap, TelemetryPoint } from './types';

// ─── チャンネル可用性 ────────────────────────────────────────

/** 比較で扱いうるチャンネル識別子 */
export type ChannelKey = 'speed' | 'longG' | 'latG' | 'throttle' | 'brake' | 'steering' | 'rpm';

/** 各チャンネルが「実データに存在するか / 導出可能か」の判定結果 */
export type ChannelAvailability = Record<ChannelKey, boolean>;

/**
 * 点列から利用可能なチャンネルを判定する（捏造防止のゲート）。
 * - speed: 速度値が1点でも有限なら可（パーサーが GPS から保証する主力CH）
 * - longG/latG: GPS（lat/lon）が2点以上あれば速度/方位変化から導出可能
 * - throttle/brake/steering/rpm: 現行 TelemetryPoint には存在しない。
 *   将来フィールドが追加された時のために判定枠だけ用意し、現状は常に false。
 *   「無いチャンネルは出さない」を型レベルでも保証する。
 */
export function channelAvailability(points: readonly TelemetryPoint[]): ChannelAvailability {
  let hasSpeed = false;
  let gpsCount = 0;
  for (const p of points) {
    if (Number.isFinite(p.speed)) hasSpeed = true;
    if (p.lat !== null && p.lon !== null) gpsCount++;
    if (hasSpeed && gpsCount >= 2) break;
  }
  const hasGps = gpsCount >= 2;
  return {
    speed: hasSpeed,
    longG: hasGps || hasSpeed, // 前後Gは速度の時間微分でも出せる
    latG: hasGps, // 横Gは進行方位の変化（曲率）×速度が必要 → GPS 必須
    throttle: false,
    brake: false,
    steering: false,
    rpm: false,
  };
}

// ─── 横G（GPS 由来）の導出 ───────────────────────────────────

/**
 * 横加速度（G）系列を返す（points と同じ長さ）。
 * GPS 軌跡の局所平面投影から進行方向ベクトルの回転（=ヨーレート）を求め、
 * 横G = v × yawRate / 9.81 として算出する（v は m/s）。
 * - 符号: 右旋回が正・左旋回が負（XY 平面 x=東/y=北、時計回り＝右を正にとる）
 * - GPS 欠損・dt<=0・速度極小（< 1 m/s）区間は 0
 * 前後Gと同じく窓±2の移動平均で平滑化する（ノイズの多い数値微分のため）。
 */
export function calcLatG(points: readonly TelemetryPoint[]): number[] {
  const n = points.length;
  if (n === 0) return [];
  const origin = (() => {
    for (const p of points) if (p.lat !== null && p.lon !== null) return { lat: p.lat, lon: p.lon };
    return null;
  })();
  if (!origin) return points.map(() => 0);
  const { toXY } = makeLocalProjection(origin);

  // 各点の進行方位（XY 上、ラジアン）。前後の有効GPS点から中心差分で推定
  const headings: (number | null)[] = points.map((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];
    const a = prev && prev.lat !== null && prev.lon !== null ? prev : p;
    const b = next && next.lat !== null && next.lon !== null ? next : p;
    if (a.lat === null || a.lon === null || b.lat === null || b.lon === null) return null;
    const pa = toXY({ lat: a.lat, lon: a.lon });
    const pb = toXY({ lat: b.lat, lon: b.lon });
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    if (dx === 0 && dy === 0) return null;
    return Math.atan2(dy, dx);
  });

  const raw: number[] = [0];
  for (let i = 1; i < n; i++) {
    const dt = points[i].time - points[i - 1].time;
    const h1 = headings[i];
    const h0 = headings[i - 1];
    const vMps = points[i].speed / 3.6;
    if (dt > 0 && h0 !== null && h1 !== null && vMps >= 1) {
      // 方位差を -π..π に正規化（XY 上は反時計回りが正）
      let dTheta = h1 - h0;
      while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
      const yawRate = dTheta / dt; // rad/s（反時計回り正）
      // 横加速度 = v * yawRate。右旋回（時計回り=yawRate<0）を正にしたいので符号反転
      raw.push((-vMps * yawRate) / 9.81);
    } else {
      raw.push(0);
    }
  }

  // 移動平均平滑化（窓 ±2）
  const halfWindow = 2;
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(raw.length - 1, i + halfWindow); j++) {
      sum += raw[j];
      count++;
    }
    out.push(Math.round((sum / count) * 1000) / 1000);
  }
  return out;
}

// ─── ラップを距離軸の系列に展開 ──────────────────────────────

/** 1ラップを距離軸（ラップ開始基準 m）で表したチャンネル群 */
export interface LapProfile {
  /** ラップ開始地点からの距離（m）。単調非減少 */
  distance: number[];
  /** ラップ開始からの経過時間（s）。distance と同じ長さ・単調増加 */
  elapsed: number[];
  /** 速度（km/h） */
  speed: number[];
  /** 前後G */
  longG: number[];
  /** 横G */
  latG: number[];
  /** ラップ全長（m）= distance の最後 */
  lapLengthM: number;
}

/**
 * ラップの時間範囲に含まれる点を切り出し、距離・経過時間・各チャンネルを
 * ラップ開始基準に揃えた LapProfile を返す。
 * cumulative/longG/latG はセッション全体で1回計算した配列を渡して使い回す
 * （sessionDistance/sessionLongG/sessionLatG は points と同じ長さ・同じ並び）。
 */
export function buildLapProfile(
  points: readonly TelemetryPoint[],
  sessionDistance: readonly number[],
  sessionLongG: readonly number[],
  sessionLatG: readonly number[],
  lap: Lap,
): LapProfile {
  const distance: number[] = [];
  const elapsed: number[] = [];
  const speed: number[] = [];
  const longG: number[] = [];
  const latG: number[] = [];
  let baseDist: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const t = points[i].time;
    if (t < lap.startTime) continue;
    if (t > lap.endTime) break;
    if (baseDist === null) baseDist = sessionDistance[i];
    distance.push(sessionDistance[i] - baseDist);
    elapsed.push(t - lap.startTime);
    speed.push(points[i].speed);
    longG.push(sessionLongG[i] ?? 0);
    latG.push(sessionLatG[i] ?? 0);
  }
  return {
    distance,
    elapsed,
    speed,
    longG,
    latG,
    lapLengthM: distance.length > 0 ? distance[distance.length - 1] : 0,
  };
}

/** LapProfile を作るためのセッション派生配列をまとめて計算する */
export function deriveCompareSeries(points: readonly TelemetryPoint[]): {
  distance: number[];
  longG: number[];
  latG: number[];
} {
  return {
    distance: calcCumulativeDistance(points as TelemetryPoint[]),
    longG: calcLongG(points as TelemetryPoint[]),
    latG: calcLatG(points),
  };
}

// ─── デルタT（累積タイム差トレース） ────────────────────────

/** デルタT の1点 */
export interface DeltaTPoint {
  /** 共通距離グリッド上の距離（m、両ラップで共通の 0..commonLength） */
  distance: number;
  /** B の A に対する累積タイム差（s）。正 = B が遅い / 負 = B が速い */
  delta: number;
}

/** デルタT トレースと付随情報 */
export interface DeltaTResult {
  points: DeltaTPoint[];
  /** 比較に使った共通距離長（m）= 両ラップ長の短い方 */
  commonLengthM: number;
  /** 終端でのデルタ（≈ ラップタイム差。符号: 正 = B 遅い） */
  finalDelta: number;
}

/**
 * 距離 d までにラップが要した経過時間（s）を返す距離→時間プロファイル。
 * distance/elapsed は単調増加前提。範囲外は端点 clamp（resample 流儀）。
 */
function distanceToElapsed(profile: LapProfile): DistanceSeries {
  return { distance: profile.distance, value: profile.elapsed };
}

/**
 * ラップB の ラップA に対する累積タイム差を距離軸で返す。
 * 両ラップを「両者の短い方の全長」までの共通距離グリッド（step m 間隔）に
 * 再サンプルし、ΔT(d) = elapsedB(d) − elapsedA(d) を算出する。
 * これによりサンプル数・レート・開始内挿のずれを吸収する。
 *
 * @param a ラップA（基準）の距離プロファイル
 * @param b ラップB（比較）の距離プロファイル
 * @param stepM グリッド間隔（m）。既定 10m（1周あたり数百点）
 */
export function deltaT(a: LapProfile, b: LapProfile, stepM = 10): DeltaTResult {
  const commonLengthM = Math.min(a.lapLengthM, b.lapLengthM);
  if (commonLengthM <= 0 || a.distance.length < 2 || b.distance.length < 2) {
    return { points: [], commonLengthM: 0, finalDelta: 0 };
  }
  const grid = buildDistanceGrid(commonLengthM, stepM);
  const ea = distanceToElapsed(a);
  const eb = distanceToElapsed(b);
  const points: DeltaTPoint[] = [];
  for (const d of grid) {
    const ta = interpolateAt(ea, d);
    const tb = interpolateAt(eb, d);
    if (ta === null || tb === null) continue;
    points.push({ distance: d, delta: tb - ta });
  }
  const finalDelta = points.length > 0 ? points[points.length - 1].delta : 0;
  return { points, commonLengthM, finalDelta };
}

// ─── 拡張指標 ────────────────────────────────────────────────

/** ラップ単位の拡張指標（導出できない項目は null） */
export interface LapMetrics {
  /** ラップタイム（s） */
  lapTimeSeconds: number;
  /** 最高速度（km/h） */
  topSpeedKmh: number | null;
  /** 最高速到達地点（ラップ開始からの距離 m） */
  topSpeedAtM: number | null;
  /** 最小コーナリング速度（km/h）= ラップ中の最低速度 */
  minCornerSpeedKmh: number | null;
  /** 平均の絶対前後G */
  avgAbsLongG: number | null;
  /** 最大減速G（最も負側、絶対値表示用に符号そのまま） */
  maxBrakingG: number | null;
  /** 最大横G（絶対値） */
  maxLatG: number | null;
  /**
   * ブレーキングポイント: 「最も遅いコーナー」直前の減速開始地点（ラップ開始からの距離 m）。
   * 速度の減速開始（前後Gが負側へ転じる点）から推定。コーナーが特定できなければ null。
   */
  brakingPointM: number | null;
  /** 最小コーナリング速度地点（= 最遅コーナーの距離 m） */
  slowestCornerAtM: number | null;
  /** フルスロットル割合（%）。スロットルCHが無い現状は null（捏造禁止） */
  fullThrottlePct: number | null;
}

/** 減速開始点の検出に使う前後Gの閾値（G）。これより負＝明確な制動 */
const BRAKING_G_THRESHOLD = -0.15;

/**
 * 最も遅いコーナー（最小速度点）と、その手前の減速開始地点を推定する。
 * 減速開始 = 最小速度点から距離をさかのぼり、前後Gが BRAKING_G_THRESHOLD より
 * 負（明確な制動）であった連続区間の入口。GPS/速度のみで成立しブレーキCH不要。
 */
function detectBrakingPoint(profile: LapProfile): { slowestAtM: number | null; brakingPointM: number | null } {
  const { speed, distance, longG } = profile;
  if (speed.length < 3) return { slowestAtM: null, brakingPointM: null };

  // 最小速度点（= 最も遅いコーナー）
  let minIdx = 0;
  for (let i = 1; i < speed.length; i++) {
    if (speed[i] < speed[minIdx]) minIdx = i;
  }
  const slowestAtM = distance[minIdx];

  // 最小速度点から手前へ、制動が続いていた区間の入口を探す
  let i = minIdx;
  // まず「制動していない」状態まで戻りすぎないよう、制動が始まる点を探索
  let entry: number | null = null;
  while (i > 0) {
    if (longG[i] <= BRAKING_G_THRESHOLD) {
      entry = i;
      i--;
    } else if (entry !== null) {
      // 制動区間がいったん途切れた → 直近に見つけた制動入口を採用
      break;
    } else {
      i--;
    }
  }
  return { slowestAtM, brakingPointM: entry !== null ? distance[entry] : null };
}

/** 1ラップの拡張指標を計算する */
export function computeLapMetrics(profile: LapProfile, lapTimeSeconds: number): LapMetrics {
  const { speed, distance, longG, latG } = profile;
  if (speed.length === 0) {
    return {
      lapTimeSeconds,
      topSpeedKmh: null,
      topSpeedAtM: null,
      minCornerSpeedKmh: null,
      avgAbsLongG: null,
      maxBrakingG: null,
      maxLatG: null,
      brakingPointM: null,
      slowestCornerAtM: null,
      fullThrottlePct: null,
    };
  }

  let topSpeedKmh = -Infinity;
  let topSpeedAtM: number | null = null;
  let minSpeed = Infinity;
  let sumAbsLongG = 0;
  let maxBrakingG = 0;
  let maxLatG = 0;
  for (let i = 0; i < speed.length; i++) {
    if (speed[i] > topSpeedKmh) {
      topSpeedKmh = speed[i];
      topSpeedAtM = distance[i];
    }
    if (speed[i] < minSpeed) minSpeed = speed[i];
    sumAbsLongG += Math.abs(longG[i]);
    if (longG[i] < maxBrakingG) maxBrakingG = longG[i];
    const al = Math.abs(latG[i]);
    if (al > maxLatG) maxLatG = al;
  }

  const { slowestAtM, brakingPointM } = detectBrakingPoint(profile);

  return {
    lapTimeSeconds,
    topSpeedKmh: Number.isFinite(topSpeedKmh) ? topSpeedKmh : null,
    topSpeedAtM,
    minCornerSpeedKmh: Number.isFinite(minSpeed) ? minSpeed : null,
    avgAbsLongG: Math.round((sumAbsLongG / speed.length) * 1000) / 1000,
    maxBrakingG: maxBrakingG < 0 ? Math.round(maxBrakingG * 1000) / 1000 : null,
    maxLatG: maxLatG > 0 ? Math.round(maxLatG * 1000) / 1000 : null,
    brakingPointM,
    slowestCornerAtM: slowestAtM,
    fullThrottlePct: null, // スロットルCHなし
  };
}

// ─── 区間分割（公式セクターではない「区間1〜3」） ──────────────

/** 距離3等分の区間別デルタ */
export interface SegmentDelta {
  /** 1始まりの区間番号（公式セクターではない） */
  segment: number;
  /** 区間の距離範囲（m） */
  fromM: number;
  toM: number;
  /** この区間で B が A に対して得失したタイム（s）。正 = B 遅い */
  delta: number;
}

/**
 * デルタT を距離3等分し、各区間でのデルタ増分を返す。
 * 区間デルタ = 区間終端のΔT − 区間始端のΔT（その区間内で何秒得失したか）。
 * 公式セクターではないため UI で「区間」と明示すること。
 */
export function computeSegmentDeltas(deltaResult: DeltaTResult, segments = 3): SegmentDelta[] {
  const { points, commonLengthM } = deltaResult;
  if (points.length < 2 || commonLengthM <= 0) return [];
  const segLen = commonLengthM / segments;
  const deltaAt = (d: number): number => {
    const series: DistanceSeries = {
      distance: points.map((p) => p.distance),
      value: points.map((p) => p.delta),
    };
    return interpolateAt(series, d) ?? 0;
  };
  const result: SegmentDelta[] = [];
  for (let s = 0; s < segments; s++) {
    const fromM = s * segLen;
    const toM = s === segments - 1 ? commonLengthM : (s + 1) * segLen;
    result.push({
      segment: s + 1,
      fromM,
      toM,
      delta: deltaAt(toM) - deltaAt(fromM),
    });
  }
  return result;
}

// ─── 同期カーソル用: 距離における両ラップの読み出し ────────────

/** ある距離における1ラップの瞬時値（同期カーソルの読み出し用） */
export interface CursorReadout {
  speedKmh: number | null;
  longG: number | null;
  latG: number | null;
  /** ラップ開始からの経過時間（s） */
  elapsedS: number | null;
}

/** 距離 d における profile の各チャンネル値を線形補間で返す */
export function readoutAt(profile: LapProfile, d: number): CursorReadout {
  if (profile.distance.length === 0) {
    return { speedKmh: null, longG: null, latG: null, elapsedS: null };
  }
  return {
    speedKmh: interpolateAt({ distance: profile.distance, value: profile.speed }, d),
    longG: interpolateAt({ distance: profile.distance, value: profile.longG }, d),
    latG: interpolateAt({ distance: profile.distance, value: profile.latG }, d),
    elapsedS: interpolateAt({ distance: profile.distance, value: profile.elapsed }, d),
  };
}

/**
 * 距離 d における GPS 位置（局所平面 XY、origin 基準 m）を返す。
 * コースマップ上の現在位置ドットを動かすために使う。GPS 欠損で求まらなければ null。
 */
export function positionAt(
  points: readonly TelemetryPoint[],
  sessionDistance: readonly number[],
  lap: Lap,
  origin: { lat: number; lon: number },
  d: number,
): [number, number] | null {
  const { toXY } = makeLocalProjection(origin);
  const xs: number[] = [];
  const ysX: number[] = [];
  const ysY: number[] = [];
  let baseDist: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const t = points[i].time;
    if (t < lap.startTime) continue;
    if (t > lap.endTime) break;
    if (points[i].lat === null || points[i].lon === null) continue;
    if (baseDist === null) baseDist = sessionDistance[i];
    const xy = toXY({ lat: points[i].lat as number, lon: points[i].lon as number });
    xs.push(sessionDistance[i] - baseDist);
    ysX.push(xy.x);
    ysY.push(xy.y);
  }
  if (xs.length === 0) return null;
  const x = interpolateAt({ distance: xs, value: ysX }, d);
  const y = interpolateAt({ distance: xs, value: ysY }, d);
  if (x === null || y === null) return null;
  return [x, y];
}

// 公開: 再サンプル基盤も比較モジュール経由で使えるよう再エクスポート
export { resampleOnGrid, buildDistanceGrid, interpolateAt };
export type { DistanceSeries };
