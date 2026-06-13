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
