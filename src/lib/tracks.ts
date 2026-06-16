// 国内主要サーキット DB — スタート/フィニッシュライン定義と自動推定
//
// ============================================================================
// 座標の精度について（重要）
//
// - suzuka-full のラインは実走 GPS データ（DigiSpice 実ログ、本リポジトリの
//   サンプル amuse_Z34_Ooi_*.dtb）でライン通過点・通過方位を校正済み。
// - それ以外のサーキットのライン座標は公開航空写真・地図の知識に基づく
//   近似値であり、誤差は数十〜数百 m に達しうる。コントロールラインの
//   実用精度（±15m 程度）は保証できないため、DB ラインでラップが切れない
//   場合は estimateStartFinishLine（軌跡からの自動推定）へフォールバック
//   すること（取込 UI 側 = WP5 の責務）。実走データを得しだい suzuka-full と
//   同じ手順で校正していく前提の初期値である。
//
// ライン半長の設計:
// - ライン線分はコース幅+マージン程度に保つ（長すぎるとピットレーン通過を
//   ラップとして誤検出し、短すぎると座標誤差で取りこぼす）
// - 校正済み: ±15m / 未校正の大型コース: ±25m / 未校正のミニサーキット: ±18m
//   （ミニサーキットはピットがコースに近いため控えめにする）
// ============================================================================

import { cleanGpsPoints } from './telemetry/detectLaps';
import { haversineMeters, makeLocalProjection } from './telemetry/geo';
import type { LatLon, StartFinishLine, TelemetryPoint } from './telemetry/types';

export interface TrackMapPoint extends LatLon {
  /** S/Fラインからの概算距離（m）。表示用なのでラップ検出には使わない */
  distanceM: number;
}

export interface TrackMapSector {
  id: string;
  name: string;
  startDistanceM: number;
  endDistanceM: number;
}

export interface TrackMapMarker {
  id: string;
  name: string;
  distanceM: number;
  kind: 'corner' | 'sector' | 'reference';
}

export interface TrackMapCurb {
  id: string;
  name: string;
  startDistanceM: number;
  endDistanceM: number;
  side: 'left' | 'right' | 'both';
}

export interface TrackMap {
  /** データ由来。official 以外は UI/仕様書で概算であることを示す */
  source: 'official' | 'sample-derived' | 'manual';
  /** 境界線を簡易生成するための平均コース幅（m）。将来は左右境界ポリラインへ置換する */
  widthM: number;
  /** 表示用中心線。距離は単調増加、最後はおおむねS/Fへ戻る */
  centerline: readonly TrackMapPoint[];
  sectors: readonly TrackMapSector[];
  markers: readonly TrackMapMarker[];
  curbs: readonly TrackMapCurb[];
  notes?: string;
}

/** サーキット定義 */
export interface Track {
  /** 安定識別子（保存データの evidence.trackId に使う） */
  id: string;
  /** 表示名 */
  name: string;
  /** スタート/フィニッシュライン（2点で定義する線分） */
  startFinishLine: StartFinishLine;
  /** 最小ラップ時間（秒）— このコースで物理的にあり得る最速周回より短く設定 */
  minLapSeconds: number;
  /** 地域（都道府県） */
  region: string;
  /** コース幅・境界・セクター・コーナー名など、解析画面の表示用マップ */
  map?: TrackMap;
}

/**
 * ライン中心座標・通過方位・半長からライン線分（2点）を生成する。
 * 中心+方位で定義すると航空写真からの読み取り・実走データでの校正が容易。
 */
function lineFromCenterCourse(center: LatLon, courseDeg: number, halfWidthM: number): StartFinishLine {
  const { fromXY } = makeLocalProjection(center);
  const rad = (courseDeg * Math.PI) / 180;
  // 進行方向（x=東, y=北）= (sin, cos)、その垂直 = (cos, -sin)
  const perpX = Math.cos(rad);
  const perpY = -Math.sin(rad);
  return [
    fromXY({ x: halfWidthM * perpX, y: halfWidthM * perpY }),
    fromXY({ x: -halfWidthM * perpX, y: -halfWidthM * perpY }),
  ];
}

const SUZUKA_FULL_CENTERLINE: readonly TrackMapPoint[] = [
  { distanceM: 0, lat: 34.844794, lon: 136.538867 },
  { distanceM: 248, lat: 34.843085, lon: 136.540617 },
  { distanceM: 506, lat: 34.841294, lon: 136.542403 },
  { distanceM: 751, lat: 34.839349, lon: 136.54332 },
  { distanceM: 1001, lat: 34.840052, lon: 136.541475 },
  { distanceM: 1248, lat: 34.841253, lon: 136.539359 },
  { distanceM: 1499, lat: 34.842461, lon: 136.537431 },
  { distanceM: 1751, lat: 34.84454, lon: 136.53715 },
  { distanceM: 1996, lat: 34.844906, lon: 136.534684 },
  { distanceM: 2251, lat: 34.843326, lon: 136.532715 },
  { distanceM: 2501, lat: 34.843832, lon: 136.5306 },
  { distanceM: 2752, lat: 34.846061, lon: 136.530224 },
  { distanceM: 3001, lat: 34.846469, lon: 136.529729 },
  { distanceM: 3254, lat: 34.845361, lon: 136.52751 },
  { distanceM: 3496, lat: 34.846158, lon: 136.525097 },
  { distanceM: 3747, lat: 34.848111, lon: 136.523772 },
  { distanceM: 4002, lat: 34.847358, lon: 136.522089 },
  { distanceM: 4253, lat: 34.845987, lon: 136.524244 },
  { distanceM: 4498, lat: 34.845094, lon: 136.526693 },
  { distanceM: 4747, lat: 34.844323, lon: 136.529258 },
  { distanceM: 4996, lat: 34.843949, lon: 136.53188 },
  { distanceM: 5252, lat: 34.845378, lon: 136.534035 },
  { distanceM: 5498, lat: 34.846038, lon: 136.536345 },
  { distanceM: 5752, lat: 34.844993, lon: 136.538648 },
  { distanceM: 5781, lat: 34.844794, lon: 136.538867 },
];

const SUZUKA_FULL_MAP: TrackMap = {
  source: 'sample-derived',
  widthM: 14,
  centerline: SUZUKA_FULL_CENTERLINE,
  sectors: [
    { id: 's1', name: 'S1 東コース前半', startDistanceM: 0, endDistanceM: 1750 },
    { id: 's2', name: 'S2 東コース後半', startDistanceM: 1750, endDistanceM: 3000 },
    { id: 's3', name: 'S3 西コース', startDistanceM: 3000, endDistanceM: 5000 },
    { id: 's4', name: 'S4 130R-最終', startDistanceM: 5000, endDistanceM: 5781 },
  ],
  markers: [
    { id: 'turn-1', name: '1コーナー', distanceM: 650, kind: 'corner' },
    { id: 'turn-2', name: '2コーナー', distanceM: 820, kind: 'corner' },
    { id: 's-curves', name: 'S字', distanceM: 1110, kind: 'corner' },
    { id: 'gyaku-bank', name: '逆バンク', distanceM: 1480, kind: 'corner' },
    { id: 'dunlop', name: 'ダンロップ', distanceM: 1740, kind: 'corner' },
    { id: 'degner', name: 'デグナー', distanceM: 2220, kind: 'corner' },
    { id: 'hairpin', name: 'ヘアピン', distanceM: 2940, kind: 'corner' },
    { id: 'spoon', name: 'スプーン', distanceM: 3820, kind: 'corner' },
    { id: 'back-straight', name: '西ストレート', distanceM: 4600, kind: 'reference' },
    { id: 'one-thirty-r', name: '130R', distanceM: 5120, kind: 'corner' },
    { id: 'chicane', name: 'シケイン', distanceM: 5480, kind: 'corner' },
    { id: 'final-corner', name: '最終コーナー', distanceM: 5680, kind: 'corner' },
  ],
  curbs: [
    { id: 't1-t2-curb', name: '1-2コーナー縁石', startDistanceM: 620, endDistanceM: 900, side: 'both' },
    { id: 's-curves-curb', name: 'S字縁石', startDistanceM: 1020, endDistanceM: 1450, side: 'both' },
    { id: 'degner-curb', name: 'デグナー縁石', startDistanceM: 2100, endDistanceM: 2370, side: 'both' },
    { id: 'hairpin-curb', name: 'ヘアピン縁石', startDistanceM: 2840, endDistanceM: 3070, side: 'both' },
    { id: 'spoon-curb', name: 'スプーン縁石', startDistanceM: 3650, endDistanceM: 4120, side: 'both' },
    { id: 'chicane-curb', name: 'シケイン縁石', startDistanceM: 5400, endDistanceM: 5580, side: 'both' },
  ],
  notes:
    'DigiSpice同梱サンプルのGPS中心線から作った表示用マップ。境界は平均幅からの簡易生成で、公式測量値ではない。',
};

/**
 * 国内主要サーキット一覧。
 * courseDeg はコントロールライン通過時の進行方位（度）。
 */
export const TRACKS: readonly Track[] = [
  {
    id: 'suzuka-full',
    name: '鈴鹿サーキット（国際レーシングコース）',
    // 実走 GPS データで校正済み: ライン通過点 (34.844794, 136.538867)、
    // 通過方位 138.8°。中心はその 5m 手前（コース上流側）に置き、
    // ラップ起点ファイルの先頭点が数値誤差でライン上に乗る縁を避けている
    startFinishLine: lineFromCenterCourse({ lat: 34.844828, lon: 136.53883 }, 138.8, 15),
    minLapSeconds: 70, // 歴代最速 (F1) 約87秒
    region: '三重県',
    map: SUZUKA_FULL_MAP,
  },
  {
    id: 'tsukuba-2000',
    name: '筑波サーキット コース2000',
    // 近似値（未校正）: ホームストレートのコントロールライン付近、東向き
    startFinishLine: lineFromCenterCourse({ lat: 36.1508, lon: 139.9192 }, 82, 18),
    minLapSeconds: 40, // コースレコード約50秒
    region: '茨城県',
  },
  {
    id: 'fuji-main',
    name: '富士スピードウェイ（本コース）',
    // 近似値（未校正）: 1.5km ストレート上のコントロールライン付近、西向き
    startFinishLine: lineFromCenterCourse({ lat: 35.3718, lon: 138.9266 }, 257, 25),
    minLapSeconds: 65, // 歴代最速 (F1) 約78秒
    region: '静岡県',
  },
  {
    id: 'motegi-road',
    name: 'モビリティリゾートもてぎ（ロードコース)',
    // 近似値（未校正）: ホームストレート、西向き
    startFinishLine: lineFromCenterCourse({ lat: 36.5317, lon: 140.2276 }, 268, 25),
    minLapSeconds: 75, // SF 約91秒
    region: '栃木県',
  },
  {
    id: 'okayama-international',
    name: '岡山国際サーキット',
    // 近似値（未校正）: ホームストレート、西南西向き
    startFinishLine: lineFromCenterCourse({ lat: 34.9148, lon: 134.2213 }, 247, 25),
    minLapSeconds: 60, // SF 約73秒
    region: '岡山県',
  },
  {
    id: 'sugo',
    name: 'スポーツランドSUGO（国際レーシングコース）',
    // 近似値（未校正）: ホームストレート、西南西向き
    startFinishLine: lineFromCenterCourse({ lat: 38.1365, lon: 140.7778 }, 252, 25),
    minLapSeconds: 55, // SF 約63秒
    region: '宮城県',
  },
  {
    id: 'central',
    name: 'セントラルサーキット',
    // 近似値（未校正）: ホームストレート、西向き
    startFinishLine: lineFromCenterCourse({ lat: 34.9995, lon: 134.9715 }, 280, 25),
    minLapSeconds: 50,
    region: '兵庫県',
  },
  {
    id: 'nikko',
    name: '日光サーキット',
    // 近似値（未校正）: ミニサーキット（1.07km）、ホームストレート西向き
    startFinishLine: lineFromCenterCourse({ lat: 36.5703, lon: 139.8358 }, 250, 18),
    minLapSeconds: 30, // コースレコード約37秒
    region: '栃木県',
  },
  {
    id: 'honjo',
    name: '本庄サーキット',
    // 近似値（未校正）: ミニサーキット（1.12km）、ホームストレート東向き
    startFinishLine: lineFromCenterCourse({ lat: 36.2033, lon: 139.1475 }, 95, 18),
    minLapSeconds: 30,
    region: '埼玉県',
  },
  {
    id: 'ebisu-east',
    name: 'エビスサーキット 東コース',
    // 近似値（未校正）: 西コースと近接しているため guessTrack は
    // ライン中心への最接近距離が小さい方を採用する
    startFinishLine: lineFromCenterCourse({ lat: 37.6464, lon: 140.3776 }, 200, 18),
    minLapSeconds: 45,
    region: '福島県',
  },
  {
    id: 'ebisu-west',
    name: 'エビスサーキット 西コース',
    // 近似値（未校正）
    startFinishLine: lineFromCenterCourse({ lat: 37.6408, lon: 140.3723 }, 30, 18),
    minLapSeconds: 45,
    region: '福島県',
  },
  {
    id: 'sodegaura',
    name: '袖ヶ浦フォレストレースウェイ',
    // 近似値（未校正）: ホームストレート、西南西向き
    startFinishLine: lineFromCenterCourse({ lat: 35.3737, lon: 139.9818 }, 245, 25),
    minLapSeconds: 50,
    region: '千葉県',
  },
  {
    id: 'autopolis',
    name: 'オートポリス（インターナショナルレーシングコース）',
    // 近似値（未校正）: ホームストレート、西南西向き
    startFinishLine: lineFromCenterCourse({ lat: 33.0346, lon: 131.0279 }, 245, 25),
    minLapSeconds: 70, // SF 約84秒
    region: '大分県',
  },
  {
    id: 'tokachi',
    name: '十勝スピードウェイ',
    // 近似値（未校正）: ホームストレート、南向き
    startFinishLine: lineFromCenterCourse({ lat: 42.6432, lon: 143.1631 }, 185, 25),
    minLapSeconds: 55,
    region: '北海道',
  },
];

/** guessTrack の採用閾値（m）: 軌跡がライン中心へこれ以上近づかないコースは候補外 */
const GUESS_THRESHOLD_M = 1500;

/** 距離計算の点数上限（長大セッションでも計算量を抑える） */
const MAX_SAMPLED_POINTS = 500;

/**
 * GPS 軌跡から走行サーキットを推定する。
 *
 * 各コースのライン中心に対する「軌跡上の最接近距離」を求め、閾値
 * （1.5km）以内で最も近いコースを返す。周回軌跡は自コースの S/F ライン
 * 付近を必ず通過するため、座標 DB が数百 m ずれていても判別には十分。
 * 近接する別コース（エビス東/西など）は最接近距離の小さい方が選ばれる。
 *
 * @param points テレメトリ点列（GPS 欠損点が混ざっていてもよい）
 * @returns 推定された Track。閾値内のコースが無ければ null
 */
export function guessTrack(points: readonly TelemetryPoint[]): Track | null {
  const clean = cleanGpsPoints(points);
  if (clean.length === 0) return null;

  const stride = Math.max(1, Math.ceil(clean.length / MAX_SAMPLED_POINTS));

  let best: Track | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const track of TRACKS) {
    const [a, b] = track.startFinishLine;
    const center: LatLon = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
    let minDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < clean.length; i += stride) {
      const d = haversineMeters({ lat: clean[i].lat, lon: clean[i].lon }, center);
      if (d < minDist) minDist = d;
      if (minDist < 30) break; // 十分近い — 早期終了
    }
    if (minDist < bestDist) {
      bestDist = minDist;
      best = track;
    }
  }

  return bestDist <= GUESS_THRESHOLD_M ? best : null;
}

/**
 * ID からサーキット定義を取得する。
 * @returns 該当する Track。存在しなければ null
 */
export function findTrackById(id: string): Track | null {
  return TRACKS.find((t) => t.id === id) ?? null;
}
