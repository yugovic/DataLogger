// テレメトリ共通型定義 — VELOCITY LOGGER ロガー連携コア (WP4)
//
// 設計原則:
// - 欠損値は null（0 への変換禁止 — 偽データ混入は事業上の欠陥として扱う）
// - time はセッション先頭からの経過秒に正規化する
// - パース失敗は TelemetryParseError を throw し、「何のフォーマットとして」
//   「なぜ」失敗したかをメッセージに含める

/** 緯度経度（度、WGS84） */
export interface LatLon {
  /** 緯度（度） */
  lat: number;
  /** 経度（度） */
  lon: number;
}

/**
 * テレメトリの1サンプル点。
 * 全フォーマット（AIM CSV / DigiSpice .dtb / NMEA RMC）をこの形に正規化する。
 */
export interface TelemetryPoint {
  /** セッション先頭からの経過秒 */
  time: number;
  /** 緯度（度）。GPS チャネルが無い場合は null */
  lat: number | null;
  /** 経度（度）。GPS チャネルが無い場合は null */
  lon: number | null;
  /** 速度（km/h）。速度チャネルが無い場合は GPS から導出する（パーサー側で保証） */
  speed: number;
  /** 進行方位（度、真北=0・時計回り 0–360）。不明な場合は null */
  heading: number | null;
  /** 高度（m）。ロガーが出力しない場合は null */
  altitude: number | null;
}

/**
 * 対応フォーマット識別子。
 * docs/beta-requirements.md の evidence.format と同一の文字列を使う。
 */
export type TelemetryFormat = 'aim-csv' | 'digispice-dtb' | 'nmea';

/** セッションのメタ情報 */
export interface TelemetryMeta {
  /** フォーマット識別子 */
  format: TelemetryFormat;
  /** 推定サンプリングレート（Hz）。推定不能時は null */
  sampleRateHz: number | null;
  /**
   * セッション開始の実時刻。ファイルに信頼できる時刻情報が無い場合は undefined。
   * - .dtb: Excel 序数日付（JST 壁時計）を UTC 時刻に変換した値
   * - NMEA: RMC の日付+時刻フィールドを UTC として解釈した値
   *   （DigiSpice は JST をそのまま書き込むため実際は 9 時間ずれる可能性あり。
   *    README.md「タイムゾーンの扱い」参照）
   */
  startTimestamp?: Date;
  /** データソースの説明（例: 'DigiSpice .dtb (binary)'） */
  source: string;
  /** 形式固有の付加情報（表示用の文字列マップ。Venue 等） */
  extra: Record<string, string>;
}

/** パース済みテレメトリセッション */
export interface TelemetrySession {
  /** 時刻昇順のサンプル点列 */
  points: TelemetryPoint[];
  /** メタ情報 */
  meta: TelemetryMeta;
}

/**
 * テレメトリファイルのパース失敗を表すエラー。
 * 「何のフォーマットとして解析を試み、なぜ失敗したか」を必ず保持する。
 */
export class TelemetryParseError extends Error {
  /** 解析を試みたフォーマット名（例: 'DigiSpice .dtb'） */
  readonly format: string;
  /** 失敗理由（メッセージに含まれるものと同じ） */
  readonly reason: string;

  constructor(format: string, reason: string) {
    super(`${format} として解析できません: ${reason}`);
    this.name = 'TelemetryParseError';
    this.format = format;
    this.reason = reason;
  }
}

/** ラップ種別: OUT=計測開始前の不完全周 / NORMAL=完全な計測周 / IN=最後の未完了周 */
export type LapType = 'OUT' | 'NORMAL' | 'IN';

/** 検出された1ラップ */
export interface Lap {
  /** 1 始まりの通し番号（OUT ラップを含む） */
  lapNumber: number;
  /** ラップ開始時刻（セッション経過秒。ライン交差の内挿時刻） */
  startTime: number;
  /** ラップ終了時刻（セッション経過秒。ライン交差の内挿時刻） */
  endTime: number;
  /** ラップタイム（秒） = endTime - startTime */
  timeSeconds: number;
  /** ラップ種別 */
  type: LapType;
}

/** ラップ検出結果 */
export interface LapDetectionResult {
  /** 検出されたラップ（時刻順） */
  laps: Lap[];
  /** ベストラップ（NORMAL の最速）の laps 配列内インデックス。NORMAL が無い場合 null */
  bestLapIndex: number | null;
  /** コントロールライン交差時刻（内挿済み、フィルタ後）。検証・デバッグ用 */
  crossingTimes: number[];
}

/**
 * スタート/フィニッシュライン。
 * 2点を結ぶ「線分」として扱う（無限直線ではない）。
 * 線分長はコース幅程度（±15m 目安）に保つこと — 長すぎるとピットレーン
 * 通過を誤検出し、短すぎると GPS オフセットで取りこぼす。
 */
export type StartFinishLine = readonly [LatLon, LatLon];
