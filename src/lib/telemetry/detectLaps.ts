// GPS ラップ検出 — 本 WP の核心ロジック
//
// ============================================================================
// アルゴリズム概要
//
// 1. 前処理（cleanGpsPoints）
//    - GPS 欠損点・座標レンジ外・時間非増加の点を除去
//    - GPS 飛び（直前の採用点からの移動速度が物理限界 150 m/s = 540 km/h を
//      超える点）を除去。サーキット走行車両の上限を大きく超える閾値であり、
//      正常データを誤って落とすことはない
//
// 2. 交差検出
//    - スタート/フィニッシュライン（2点の線分）と、連続する GPS 点を結ぶ
//      軌跡線分との線分交差判定（ライン中点まわりの局所平面投影上で外積判定）
//    - 点がライン上に正確に乗った場合（外積=0）は「正側」とみなす。これにより
//      同一点を挟む2線分で交差が二重計上されない
//    - 交差時刻は線形内挿: t = t_i + s·(t_{i+1} − t_i)。1Hz GPS でも軌跡線分内の
//      交差位置比率 s から 1/100 秒オーダーの内挿値が得られる（誤差見積もりは
//      README 参照）
//
// 3. 誤検出対策（設計判断）
//    - 交差方向チェック: 全交差の方向で多数決を取り、少数派（逆走・ライン上での
//      切り返し等）を除外する。先頭交差基準でなく多数決にしたのは、セッション
//      冒頭の異常な1回に全体が引きずられないようにするため
//    - 最小ラップ時間ガード: 直前に採用した交差から minLapSeconds 未満の交差を
//      破棄。GPS ノイズでライン付近をジグザグした場合の多重交差を吸収する
//    - ピットレーン等での低速横断: 時間や速度では区別せず「ライン線分の長さ」で
//      防ぐ設計とした。ラインはコース幅程度（±15m）に定義し、物理的に離れた
//      ピットレーンとは交差しないようにする。速度ガードを採用しなかったのは、
//      赤旗・コースイン直後など正当な低速通過を落とすリスクがあるため。
//      ライン定義がピットレーンまで覆ってしまっている場合の誤検出は本設計の
//      既知の限界（README「限界」参照）
//
// 4. ラップ組み立て
//    - 最初の交差より前 = OUT ラップ（不完全周）
//    - 交差間 = NORMAL（計測周）
//    - 最後の交差より後 = IN ラップ（未完了周）
//    - ベストラップは NORMAL の最速
// ============================================================================

import { bearingDeg, headingDiffDeg, makeLocalProjection, type XY } from './geo';
import type { Lap, LapDetectionResult, LatLon, StartFinishLine, TelemetryPoint } from './types';

/** detectLaps のオプション */
export interface DetectLapsOptions {
  /** 最小ラップ時間（秒）。これ未満の間隔の交差は破棄。デフォルト 20 */
  minLapSeconds?: number;
  /** GPS 飛び除去の物理限界速度（m/s）。デフォルト 150（= 540 km/h） */
  maxPlausibleSpeedMps?: number;
}

const DEFAULT_MIN_LAP_SECONDS = 20;
const DEFAULT_MAX_SPEED_MPS = 150;

/** GPS が有効なクリーン済み点 */
interface CleanPoint {
  time: number;
  lat: number;
  lon: number;
}

/**
 * GPS 有効点のみを抽出し、時間逆行と GPS 飛びを除去する。
 * （detectLaps / estimateStartFinishLine 共通の前処理）
 */
export function cleanGpsPoints(points: readonly TelemetryPoint[], maxPlausibleSpeedMps: number = DEFAULT_MAX_SPEED_MPS): CleanPoint[] {
  const result: CleanPoint[] = [];
  for (const p of points) {
    if (p.lat === null || p.lon === null) continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || !Number.isFinite(p.time)) continue;
    if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) continue;

    const prev = result[result.length - 1];
    if (prev !== undefined) {
      const dt = p.time - prev.time;
      if (dt <= 0) continue; // 時間非増加
      // GPS 飛び: 物理限界超の移動（粗い等矩形近似で十分）
      const dy = (p.lat - prev.lat) * 111320;
      const dx = (p.lon - prev.lon) * 111320 * Math.cos((prev.lat * Math.PI) / 180);
      const speedMps = Math.sqrt(dx * dx + dy * dy) / dt;
      if (speedMps > maxPlausibleSpeedMps) continue;
    }
    result.push({ time: p.time, lat: p.lat, lon: p.lon });
  }
  return result;
}

/** 交差イベント（内部用） */
interface Crossing {
  /** 内挿された交差時刻（秒） */
  time: number;
  /** 交差方向: ライン線分ベクトルに対し左→右 = -1 / 右→左 = +1 */
  direction: 1 | -1;
}

/** 外積（z成分） */
function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/**
 * 軌跡とラインの全交差を検出する（内挿時刻つき・フィルタ前）。
 */
function findCrossings(clean: CleanPoint[], line: StartFinishLine): Crossing[] {
  const [a, b] = line;
  const origin: LatLon = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
  const { toXY } = makeLocalProjection(origin);
  const A = toXY(a);
  const B = toXY(b);
  const lineVx = B.x - A.x;
  const lineVy = B.y - A.y;
  const lineLen2 = lineVx * lineVx + lineVy * lineVy;
  if (lineLen2 === 0) {
    throw new Error('スタート/フィニッシュラインの2点が同一座標です（線分を定義できません）');
  }

  const crossings: Crossing[] = [];
  let prevXY: XY | null = null;
  let prevSide = 0; // 外積の生値（符号判定用）
  let prevTime = 0;

  for (const p of clean) {
    const xy = toXY({ lat: p.lat, lon: p.lon });
    // ライン（無限直線）に対する符号付き位置: cross(lineVec, p - A)
    const d = cross(lineVx, lineVy, xy.x - A.x, xy.y - A.y);

    if (prevXY !== null) {
      // 「ちょうどライン上（d=0）」は正側として扱う → 二重計上を防ぐ
      const sidePrev = prevSide >= 0 ? 1 : -1;
      const sideCurr = d >= 0 ? 1 : -1;
      if (sidePrev !== sideCurr) {
        // 軌跡線分上の交差位置比率 s ∈ [0,1)（無限直線との交点）
        const s = prevSide / (prevSide - d);
        // 交点がライン「線分」の内側か（パラメータ u ∈ [0,1]）
        const hitX = prevXY.x + s * (xy.x - prevXY.x);
        const hitY = prevXY.y + s * (xy.y - prevXY.y);
        const u = ((hitX - A.x) * lineVx + (hitY - A.y) * lineVy) / lineLen2;
        if (u >= 0 && u <= 1) {
          crossings.push({
            time: prevTime + s * (p.time - prevTime),
            direction: sideCurr === -1 ? -1 : 1,
          });
        }
      }
    }
    prevXY = xy;
    prevSide = d;
    prevTime = p.time;
  }
  return crossings;
}

/**
 * GPS 軌跡からラップを検出する。
 *
 * @param points テレメトリ点列（GPS 欠損点が混ざっていてもよい）
 * @param line スタート/フィニッシュライン（2点で定義する線分）
 * @param options 最小ラップ時間等のオプション
 * @returns ラップ一覧（OUT/NORMAL/IN）・ベストラップ・交差時刻
 */
export function detectLaps(
  points: readonly TelemetryPoint[],
  line: StartFinishLine,
  options: DetectLapsOptions = {},
): LapDetectionResult {
  const minLapSeconds = options.minLapSeconds ?? DEFAULT_MIN_LAP_SECONDS;
  const maxSpeed = options.maxPlausibleSpeedMps ?? DEFAULT_MAX_SPEED_MPS;

  const clean = cleanGpsPoints(points, maxSpeed);
  if (clean.length < 2) {
    return { laps: [], bestLapIndex: null, crossingTimes: [] };
  }

  const raw = findCrossings(clean, line);

  // --- 交差方向の多数決フィルタ（逆走・切り返しの除外） ---
  let kept = raw;
  if (raw.length > 0) {
    const sum = raw.reduce<number>((acc, c) => acc + c.direction, 0);
    const majority: 1 | -1 = sum > 0 ? 1 : sum < 0 ? -1 : raw[0].direction;
    kept = raw.filter((c) => c.direction === majority);
  }

  // --- 最小ラップ時間ガード（ライン付近の GPS ノイズによる多重交差の吸収） ---
  const crossingTimes: number[] = [];
  for (const c of kept) {
    const last = crossingTimes[crossingTimes.length - 1];
    if (last === undefined || c.time - last >= minLapSeconds) {
      crossingTimes.push(c.time);
    }
  }

  // --- ラップ組み立て ---
  const laps: Lap[] = [];
  const tStart = clean[0].time;
  const tEnd = clean[clean.length - 1].time;
  const EPS = 1e-6;

  if (crossingTimes.length > 0) {
    let lapNumber = 1;
    if (crossingTimes[0] - tStart > EPS) {
      laps.push(makeLap(lapNumber++, tStart, crossingTimes[0], 'OUT'));
    }
    for (let i = 1; i < crossingTimes.length; i++) {
      laps.push(makeLap(lapNumber++, crossingTimes[i - 1], crossingTimes[i], 'NORMAL'));
    }
    const lastCrossing = crossingTimes[crossingTimes.length - 1];
    if (tEnd - lastCrossing > EPS) {
      laps.push(makeLap(lapNumber++, lastCrossing, tEnd, 'IN'));
    }
  }

  // --- ベストラップ（NORMAL の最速） ---
  let bestLapIndex: number | null = null;
  for (let i = 0; i < laps.length; i++) {
    if (laps[i].type !== 'NORMAL') continue;
    if (bestLapIndex === null || laps[i].timeSeconds < laps[bestLapIndex].timeSeconds) {
      bestLapIndex = i;
    }
  }

  return { laps, bestLapIndex, crossingTimes };
}

function makeLap(lapNumber: number, startTime: number, endTime: number, type: Lap['type']): Lap {
  return { lapNumber, startTime, endTime, timeSeconds: endTime - startTime, type };
}

// ============================================================================
// スタート/フィニッシュライン自動推定（トラック DB に該当が無い場合）
//
// アルゴリズム（設計判断 — 精度より頑健性を優先）:
//   1. GPS 由来の対地速度（座標差分から計算。速度チャネルに依存しない）を
//      中央値フィルタで平滑化し、最高速度の点をアンカーとする。
//      理由: (a) 最高速点はコース上で最も長いストレート上にあり、毎周ほぼ同じ
//      レーシングラインを通るため周回ごとの横ずれが最小 (b) 速度が高いほど
//      交差時刻の内挿精度が上がる (c) ドライバーが最速区間で停止・徐行する
//      ことは稀で、低速区間特有の曖昧さ（ピット進入・コース脇停車）を避け
//      られる (d) 8の字コース（鈴鹿等）の立体交差は低中速コーナー付近に
//      あることが多く、最高速アンカーなら交差点と重なりにくい
//   2. アンカー半径 35m 以内を通過した「パス」を時間クラスタリングで抽出
//      （= 軌跡の自己回帰性の検出。同一地点へ周回的に回帰していることの確認）
//   3. パスが3回未満なら推定不能として null（1〜2回の通過では周回と断定できない）
//   4. 各パスの進行方位の円環平均を取り、±45° を超えて外れるパスを除外
//      （立体交差・逆走の防御）。残り3回未満なら null
//   5. 各パスの最接近点の重心をライン中心、平均方位の垂直方向をライン方向と
//      し、横ずれの標準偏差からライン半長を決める（15〜40m にクランプ）
//   6. 推定ラインで detectLaps を実行し、NORMAL ラップが1本以上検出できた
//      場合のみ採用（自己検証）。できなければ null
// ============================================================================

/** estimateStartFinishLine のオプション */
export interface EstimateLineOptions {
  /** 最小ラップ時間（秒）。パス分離と自己検証に使う。デフォルト 20 */
  minLapSeconds?: number;
  /** GPS 飛び除去の物理限界速度（m/s）。デフォルト 150 */
  maxPlausibleSpeedMps?: number;
}

/** アンカー近傍とみなす半径（m） */
const ANCHOR_RADIUS_M = 35;

/**
 * 軌跡の自己回帰性からスタート/フィニッシュ候補線を自動推定する。
 * トラック DB に該当が無い場合のフォールバック。
 *
 * @param points テレメトリ点列
 * @param options オプション
 * @returns 推定ライン。周回性が確認できない場合は null
 */
export function estimateStartFinishLine(
  points: readonly TelemetryPoint[],
  options: EstimateLineOptions = {},
): StartFinishLine | null {
  const minLapSeconds = options.minLapSeconds ?? DEFAULT_MIN_LAP_SECONDS;
  const maxSpeed = options.maxPlausibleSpeedMps ?? DEFAULT_MAX_SPEED_MPS;

  const clean = cleanGpsPoints(points, maxSpeed);
  if (clean.length < 30) return null;
  if (clean[clean.length - 1].time - clean[0].time < minLapSeconds * 2) return null;

  // --- 1. GPS 由来速度の平滑化と最高速アンカー ---
  const proj = makeLocalProjection({ lat: clean[0].lat, lon: clean[0].lon });
  const xys = clean.map((p) => proj.toXY({ lat: p.lat, lon: p.lon }));
  const speeds: number[] = [0];
  for (let i = 1; i < clean.length; i++) {
    const dt = clean[i].time - clean[i - 1].time;
    const dx = xys[i].x - xys[i - 1].x;
    const dy = xys[i].y - xys[i - 1].y;
    speeds.push(dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0);
  }
  if (speeds.length > 1) speeds[0] = speeds[1];
  const smoothed = medianSmooth(speeds, 2);

  let anchorIdx = 0;
  for (let i = 1; i < smoothed.length; i++) {
    if (smoothed[i] > smoothed[anchorIdx]) anchorIdx = i;
  }
  const anchor = xys[anchorIdx];

  // --- 2. アンカー近傍パスの抽出（時間クラスタリング） ---
  // パス分離間隔: 35m 半径を抜けてから再進入するまでの最低時間。
  // minLapSeconds の 1/2 を上限に 10 秒とする（短い周回でも分離できるように）
  const passGapSeconds = Math.min(10, minLapSeconds / 2);
  interface Pass {
    closestIdx: number;
    closestDist: number;
  }
  const passes: Pass[] = [];
  let current: Pass | null = null;
  let lastNearTime: number | null = null;

  for (let i = 0; i < clean.length; i++) {
    const dx = xys[i].x - anchor.x;
    const dy = xys[i].y - anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ANCHOR_RADIUS_M) continue;

    if (current === null || (lastNearTime !== null && clean[i].time - lastNearTime > passGapSeconds)) {
      current = { closestIdx: i, closestDist: dist };
      passes.push(current);
    } else if (dist < current.closestDist) {
      current.closestIdx = i;
      current.closestDist = dist;
    }
    lastNearTime = clean[i].time;
  }

  // 端点（前後の点が無く方位を計算できない）のパスを除外
  const usable = passes.filter((p) => p.closestIdx > 0 && p.closestIdx < clean.length - 1);

  // --- 3. 周回性の確認: 3パス未満なら推定不能 ---
  if (usable.length < 3) return null;

  // --- 4. 進行方位の円環平均と外れパス除去（立体交差・逆走の防御） ---
  const courses = usable.map((p) =>
    bearingDeg(
      { lat: clean[p.closestIdx - 1].lat, lon: clean[p.closestIdx - 1].lon },
      { lat: clean[p.closestIdx + 1].lat, lon: clean[p.closestIdx + 1].lon },
    ),
  );
  const meanCourse = circularMeanDeg(courses);
  const inliers: number[] = [];
  for (let i = 0; i < usable.length; i++) {
    if (Math.abs(headingDiffDeg(courses[i], meanCourse)) <= 45) inliers.push(i);
  }
  if (inliers.length < 3) return null;
  const finalCourse = circularMeanDeg(inliers.map((i) => courses[i]));

  // --- 5. ライン中心と半長の決定 ---
  const closestXYs = inliers.map((i) => xys[usable[i].closestIdx]);
  const cx = closestXYs.reduce((s, p) => s + p.x, 0) / closestXYs.length;
  const cy = closestXYs.reduce((s, p) => s + p.y, 0) / closestXYs.length;

  // 進行方向（XY: x=東, y=北）とその垂直方向
  const courseRad = (finalCourse * Math.PI) / 180;
  const perpX = Math.cos(courseRad);
  const perpY = -Math.sin(courseRad);

  const lateral = closestXYs.map((p) => (p.x - cx) * perpX + (p.y - cy) * perpY);
  const mean = lateral.reduce((s, v) => s + v, 0) / lateral.length;
  const variance = lateral.reduce((s, v) => s + (v - mean) ** 2, 0) / lateral.length;
  const halfWidth = Math.min(40, Math.max(15, 15 + 2 * Math.sqrt(variance)));

  const line: StartFinishLine = [
    proj.fromXY({ x: cx + halfWidth * perpX, y: cy + halfWidth * perpY }),
    proj.fromXY({ x: cx - halfWidth * perpX, y: cy - halfWidth * perpY }),
  ];

  // --- 6. 自己検証: 推定ラインで実際にラップが切れることを確認 ---
  const result = detectLaps(points, line, { minLapSeconds, maxPlausibleSpeedMps: maxSpeed });
  const hasNormalLap = result.laps.some((lap) => lap.type === 'NORMAL');
  return hasNormalLap ? line : null;
}

/** 中央値フィルタ（窓 = ±halfWindow） */
function medianSmooth(values: readonly number[], halfWindow: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const window: number[] = [];
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(values.length - 1, i + halfWindow); j++) {
      window.push(values[j]);
    }
    window.sort((a, b) => a - b);
    out.push(window[Math.floor(window.length / 2)]);
  }
  return out;
}

/** 方位角（度）の円環平均 */
function circularMeanDeg(degs: readonly number[]): number {
  let sx = 0;
  let sy = 0;
  for (const d of degs) {
    sx += Math.cos((d * Math.PI) / 180);
    sy += Math.sin((d * Math.PI) / 180);
  }
  return ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360;
}
