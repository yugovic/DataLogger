// デモ用テレメトリの決定論的シンセサイザ
//
// 目的: Emulator 上のデモアカウントに「走行ログのある状態」を再現し、
// ダッシュボード / 履歴 / テレメトリ比較の各画面を空状態でなく確認できるようにする。
//
// 重要な設計方針:
// - 出力は **本番と同じ取込パイプライン**（detectLaps → buildTelemetryTraceFromImport）を
//   通す。デモ専用の別経路を作らないことで、デモが通れば取込経路も通ることを保証する。
// - 生成物は合成データであることを meta.source / extra.synthetic に明示する。
//   実測ログのふりをさせない（BUSINESS_PLAN: 偽データ混入ゼロ）。
// - 乱数は固定シードの PRNG のみ。Math.random は使わない（毎回同じデータになる）。

import {
  buildTelemetryTraceFromImport,
  detectLaps,
  type LapDetectionResult,
  type TelemetryPoint,
  type TelemetrySession,
} from '../lib/telemetry';
import { makeLocalProjection, type XY } from '../lib/telemetry/geo';
import { findTrackById, type Track, type TrackMapPoint } from '../lib/tracks';
import type { TelemetryTraceInput } from '../types/telemetryTrace';
import type { CarSetup } from '../types/setup';

const G = 9.80665;

/**
 * 曲率の下限半径（m）。中心線は数百m間隔の折れ線なので、補間の折れ目が
 * 実在しない極小半径として現れる。実コースの最小半径（ヘアピン相当）で
 * 頭打ちにして、非現実的な低速コーナーが生まれるのを防ぐ。
 */
const MIN_CORNER_RADIUS_M = 30;

/** 車両の走行性能パラメータ（速度プロファイル生成用の単純モデル） */
export interface DemoCarPerformance {
  /** 最高速（km/h） */
  topSpeedKmh: number;
  /** 横G限界（G） */
  maxLatG: number;
  /** 減速G限界（G） */
  maxBrakeG: number;
  /** トラクション上限の加速G（G） */
  maxAccelG: number;
  /** 駆動出力（kW）。高速域の加速はこちらで頭打ちになる */
  powerKw: number;
  /** 車重（kg） */
  massKg: number;
}

export interface DemoSessionOptions {
  /** src/lib/tracks.ts のサーキットID（map 定義を持つコースのみ対応） */
  trackId: string;
  /** セッション開始時刻 */
  sessionDate: Date;
  car: DemoCarPerformance;
  /**
   * 各周のペース係数（目標速度への倍率）。
   * 先頭 = アウトラップ、末尾 = インラップになるよう 3 周以上を指定する。
   */
  lapPaceScales: readonly number[];
  /** サンプリングレート（Hz）。デジスパイス実機に合わせて既定 5Hz */
  sampleRateHz?: number;
  /** 速度ゆらぎの再現用シード（同じ値なら常に同じ出力） */
  seed?: number;
  /** ログファイル名（証憑表示に使う） */
  fileName: string;
}

/** 距離グリッド上の走行ラインと目標速度 */
interface TrackProfile {
  /** 各サンプルの累積距離（m） */
  distanceM: number[];
  /** 局所平面座標（原点 = 中心線の先頭点） */
  xy: XY[];
  /** 距離グリッド上の目標速度（m/s） */
  speedMps: number[];
  /** 1周の距離（m） */
  lapLengthM: number;
  origin: { lat: number; lon: number };
}

// ─── 決定論的な擬似乱数 ──────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── 走行ラインの生成 ────────────────────────────────────────

/**
 * 中心線（数百m間隔の折れ線）を Catmull-Rom で補間して滑らかな閉ループにする。
 * 折れ線のままだと曲率が頂点に集中し、速度プロファイルが不自然になるため。
 */
function smoothClosedPath(points: readonly XY[], subdivisions: number): XY[] {
  const n = points.length;
  const at = (i: number): XY => points[((i % n) + n) % n];
  const out: XY[] = [];

  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

/** メンガー曲率（3点を通る円の曲率 1/R）。直線に近いほど 0 に近づく。 */
function curvatureAt(a: XY, b: XY, c: XY): number {
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ca = Math.hypot(a.x - c.x, a.y - c.y);
  if (ab === 0 || bc === 0 || ca === 0) return 0;
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(2 * cross) / (ab * bc * ca);
}

function movingAverage(values: readonly number[], halfWindow: number): number[] {
  const n = values.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = -halfWindow; k <= halfWindow; k++) {
      sum += values[((i + k) % n + n) % n];
    }
    out[i] = sum / (halfWindow * 2 + 1);
  }
  return out;
}

/**
 * 走行ラインと、その上での物理的な上限速度プロファイルを作る。
 *
 * 1. 曲率から横G限界での通過速度を求める
 * 2. 加速側（トラクション/出力制限）を前向きに伝播
 * 3. 減速側（ブレーキG制限）を後ろ向きに伝播
 * 閉ループなので 1〜3 を2巡し、周回の先頭と末尾で速度が連続するようにする。
 */
function buildTrackProfile(track: Track, car: DemoCarPerformance): TrackProfile {
  const map = track.map;
  if (!map) {
    throw new Error(`デモ用テレメトリには map 定義付きのコースが必要です: ${track.id}`);
  }

  const centerline: readonly TrackMapPoint[] = map.centerline;
  const origin = { lat: centerline[0].lat, lon: centerline[0].lon };
  const { toXY } = makeLocalProjection(origin);

  // 末尾がS/Fへ戻る定義なので、重複点を落として閉ループとして扱う
  const raw = centerline.map((p) => toXY({ lat: p.lat, lon: p.lon }));
  const last = raw[raw.length - 1];
  if (Math.hypot(last.x - raw[0].x, last.y - raw[0].y) < 5) raw.pop();

  const xy = smoothClosedPath(raw, 24);
  const n = xy.length;

  const stepM: number[] = new Array(n);
  const distanceM: number[] = new Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const nextIndex = (i + 1) % n;
    stepM[i] = Math.hypot(xy[nextIndex].x - xy[i].x, xy[nextIndex].y - xy[i].y);
    distanceM[i] = total;
    total += stepM[i];
  }

  // 曲率は約30m離れた3点から求め、GPS的なブレを避けるため平滑化する
  const span = Math.max(1, Math.round(30 / (total / n)));
  const rawCurvature = xy.map((_, i) => curvatureAt(
    xy[((i - span) % n + n) % n],
    xy[i],
    xy[(i + span) % n],
  ));
  const curvature = movingAverage(rawCurvature, 3).map((k) => Math.min(k, 1 / MIN_CORNER_RADIUS_M));

  const vMax = (car.topSpeedKmh * 1000) / 3600;
  const aLat = car.maxLatG * G;
  const aBrake = car.maxBrakeG * G;
  const speed = curvature.map((k) => Math.min(vMax, Math.sqrt(aLat / Math.max(k, 1e-6))));

  const accelLimit = (v: number): number => Math.min(car.maxAccelG * G, car.powerKw * 1000 / (car.massKg * Math.max(v, 8)));

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const cur = i;
      const next = (i + 1) % n;
      const reachable = Math.sqrt(speed[cur] ** 2 + 2 * accelLimit(speed[cur]) * stepM[cur]);
      if (speed[next] > reachable) speed[next] = reachable;
    }
    for (let i = n - 1; i >= 0; i--) {
      const cur = i;
      const next = (i + 1) % n;
      const allowed = Math.sqrt(speed[next] ** 2 + 2 * aBrake * stepM[cur]);
      if (speed[cur] > allowed) speed[cur] = allowed;
    }
  }

  return { distanceM, xy, speedMps: movingAverage(speed, 1), lapLengthM: total, origin };
}

// ─── セッション（点列）の生成 ────────────────────────────────

function interpolateXY(profile: TrackProfile, distance: number): XY {
  const { distanceM, xy, lapLengthM } = profile;
  const d = ((distance % lapLengthM) + lapLengthM) % lapLengthM;
  const n = distanceM.length;
  // 距離配列は単調増加なので二分探索で区間を引く
  let lo = 0;
  let hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (distanceM[mid] <= d) lo = mid;
    else hi = mid;
  }
  const nextIndex = (lo + 1) % n;
  const segment = (nextIndex === 0 ? lapLengthM : distanceM[nextIndex]) - distanceM[lo];
  const t = segment > 0 ? (d - distanceM[lo]) / segment : 0;
  return {
    x: xy[lo].x + (xy[nextIndex].x - xy[lo].x) * t,
    y: xy[lo].y + (xy[nextIndex].y - xy[lo].y) * t,
  };
}

function targetSpeedAt(profile: TrackProfile, distance: number): number {
  const { distanceM, speedMps, lapLengthM } = profile;
  const d = ((distance % lapLengthM) + lapLengthM) % lapLengthM;
  const n = distanceM.length;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (distanceM[mid] <= d) lo = mid;
    else hi = mid;
  }
  const nextIndex = (lo + 1) % n;
  const segment = (nextIndex === 0 ? lapLengthM : distanceM[nextIndex]) - distanceM[lo];
  const t = segment > 0 ? (d - distanceM[lo]) / segment : 0;
  return speedMps[lo] + (speedMps[nextIndex] - speedMps[lo]) * t;
}

/**
 * 合成テレメトリセッションを生成する。
 * 走り出しはコース途中（= アウトラップ相当）にして、1周目が OUT ラップとして
 * 検出されるようにする。実際の走行ログの構成（OUT → 計測周 → IN）に合わせる。
 */
export function buildDemoSession(options: DemoSessionOptions): TelemetrySession {
  const track = findTrackById(options.trackId);
  if (!track) throw new Error(`未知のサーキットIDです: ${options.trackId}`);

  const profile = buildTrackProfile(track, options.car);
  const { fromXY } = makeLocalProjection(profile.origin);
  const sampleRateHz = options.sampleRateHz ?? 5;
  const dt = 1 / sampleRateHz;
  const random = mulberry32(options.seed ?? 20260701);

  const points: TelemetryPoint[] = [];
  // コース 1/3 地点から走り出す（最初のライン通過までが OUT ラップになる）。
  // 距離 0（= S/Fライン）がラップ境界なので、ペース係数の切り替わりも
  // ライン通過と一致する。最終周は 1/3 走った時点でピットイン扱いにする。
  const startDistance = profile.lapLengthM / 3;
  const endDistance = profile.lapLengthM * (options.lapPaceScales.length - 1) + startDistance;

  let distance = startDistance;
  let time = 0;
  let previous: XY | null = null;

  while (distance < endDistance) {
    const lapIndex = Math.min(
      options.lapPaceScales.length - 1,
      Math.floor(distance / profile.lapLengthM),
    );
    const pace = options.lapPaceScales[lapIndex];
    // ±0.35km/h 程度のゆらぎ。実測ログの微細な上下動を再現するための味付け
    const jitter = 1 + (random() - 0.5) * 0.004;
    const speedMps = targetSpeedAt(profile, distance) * pace * jitter;

    const local = interpolateXY(profile, distance);
    const geo = fromXY(local);
    const heading = previous
      ? (Math.atan2(local.x - previous.x, local.y - previous.y) * 180) / Math.PI
      : null;

    points.push({
      time: Number(time.toFixed(3)),
      lat: Number(geo.lat.toFixed(7)),
      lon: Number(geo.lon.toFixed(7)),
      speed: Number((speedMps * 3.6).toFixed(2)),
      heading: heading === null ? null : Number(((heading + 360) % 360).toFixed(1)),
      altitude: null,
    });

    previous = local;
    distance += speedMps * dt;
    time += dt;
  }

  return {
    points,
    meta: {
      format: 'digispice-dtb',
      sampleRateHz,
      startTimestamp: options.sessionDate,
      // 実測ログのふりをさせない。デモ生成物であることをメタに残す
      source: 'VELOCITY LOGGER demo synthesizer (synthetic GPS trace)',
      extra: {
        synthetic: 'true',
        track: track.name,
        generator: 'src/demo/demoTelemetry.ts',
      },
    },
  };
}

export interface DemoTraceOptions extends DemoSessionOptions {
  ownerId: string;
  setupId: string;
  /** トレースの条件欄に載せる走行記録側の値 */
  setup: Pick<
    CarSetup,
    | 'carModel'
    | 'circuit'
    | 'date'
    | 'sessionType'
    | 'weather'
    | 'tireInfo'
    | 'tireSettings'
    | 'targetPressures'
    | 'sessionInfo'
    | 'notes'
  >;
}

export interface DemoTraceResult {
  trace: TelemetryTraceInput;
  detection: LapDetectionResult;
  session: TelemetrySession;
}

/**
 * 合成セッションを本番の取込パイプラインへ流し、保存形式のトレースを得る。
 * ラップ検出もサーキットDBのS/Fラインで実施するため、デモ生成が通ること自体が
 * 取込経路（ライン定義・ラップ検出・間引き）の健全性チェックになる。
 */
export function buildDemoTrace(options: DemoTraceOptions): DemoTraceResult {
  const track = findTrackById(options.trackId);
  if (!track) throw new Error(`未知のサーキットIDです: ${options.trackId}`);

  const session = buildDemoSession(options);
  const detection = detectLaps(session.points, track.startFinishLine, {
    minLapSeconds: track.minLapSeconds,
  });

  const fileSizeBytes = session.points.length * 24; // .dtb の1レコード相当の概算
  const trace = buildTelemetryTraceFromImport({
    ownerId: options.ownerId,
    setupId: options.setupId,
    setup: options.setup,
    fileName: options.fileName,
    fileSizeBytes,
    session,
    detection,
    trackId: track.id,
    lineSource: 'db',
  });

  if (!trace) {
    throw new Error(`デモトレースを生成できませんでした: ${options.fileName}`);
  }

  return {
    trace: {
      ...trace,
      // buildTelemetryTraceFromImport は importedAt に現在時刻を入れるため、
      // 再実行しても同じデータになるようセッション日時で固定する
      source: { ...trace.source, importedAt: options.sessionDate },
    },
    detection,
    session,
  };
}

/** 秒 → "M:SS.mmm" 表記（アプリ内のラップタイム表示と同じ形式） */
export function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  const secondsPart = Math.floor(rest).toString().padStart(2, '0');
  const millis = Math.round((rest - Math.floor(rest)) * 1000).toString().padStart(3, '0');
  return `${minutes}:${secondsPart}.${millis}`;
}
