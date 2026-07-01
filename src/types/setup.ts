// セットアップデータの型定義
// 原則: 未入力は null。0 や '' への変換・デモ値での充填を禁止する

import type { PublicVehicleProfile } from '../lib/vehicleProfilePublic';

export type Maybe<T> = T | null;

export interface TirePressure {
  before: Maybe<number>;
  after: Maybe<number>;
  diff?: Maybe<number>; // 導出値: before/after どちらかが null なら null
}

export interface TireSettings {
  fl: TirePressure;
  fr: TirePressure;
  rl: TirePressure;
  rr: TirePressure;
}

/** 目標温間圧（走行開始から数周後の温まりきった状態）。前軸・後軸ごとに設定する。単位 kPa。省略可 = 旧データ互換。 */
export interface TargetPressures {
  front: Maybe<number>; // フロント目標温間圧 (kPa)
  rear: Maybe<number>;  // リア目標温間圧 (kPa)
}

export type WeatherType = '晴れ' | '曇り' | 'ウェット' | 'フルウェット';

export interface WeatherCondition {
  condition: Maybe<WeatherType>;
  airTemp: Maybe<number>;
  trackTemp: Maybe<number>;
  humidity: Maybe<number>;
  pressure: Maybe<number>;
}

export interface TireInfo {
  brand: string;
  compound: string;
}

export interface SessionInfo {
  distance: Maybe<number>;
  fuel: Maybe<number>;
}

export interface SuspensionSettings {
  frontDamper: {
    compression: Maybe<number>;
    rebound: Maybe<number>;
  };
  rearDamper: {
    compression: Maybe<number>;
    rebound: Maybe<number>;
  };
  springRate: {
    front: Maybe<number>;
    rear: Maybe<number>;
  };
  rideHeight: {
    front: Maybe<number>;
    rear: Maybe<number>;
  };
  antiRollBar: {
    front: Maybe<number>;
    rear: Maybe<number>;
  };
}

export interface AlignmentSettings {
  camber: {
    front: Maybe<number>;
    rear: Maybe<number>;
  };
  toe: {
    front: Maybe<number>;
    rear: Maybe<number>;
  };
  caster: Maybe<number>;
}

export type LapType = 'IN' | 'NORMAL' | 'OUT';

export interface LapTime {
  lapNumber: number;
  time: string;
  type: LapType;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

/** ラップタイムの出所。logger = ロガーファイル由来（証憑つき） */
export type LapTimeSource = 'manual' | 'logger';

/** ロガー証憑メタデータ（lapTimeData.source === 'logger' の場合のみ付与） */
export interface LapEvidence {
  fileName: string;
  format: 'aim-csv' | 'digispice-dtb' | 'nmea'; // src/lib/telemetry/types.ts の TelemetryFormat と同一
  importedAt: Date;
  trackId: Maybe<string>; // src/lib/tracks.ts のサーキットID（推定不能時 null）
}

export interface LapTimeData {
  bestLap?: Maybe<string>;
  totalLaps?: Maybe<number>;
  laps?: LapTime[];
  source?: LapTimeSource;          // 省略時は 'manual'（旧データ互換）
  evidence?: Maybe<LapEvidence>;   // ロガー由来の場合のみ
}

/** セットアップ記録に紐づく比較用テレメトリ資産の参照 */
export interface SetupTelemetryRefs {
  traceIds: string[];
  primaryTraceId: Maybe<string>; // 代表ラップ（通常はロガー取込時のベスト NORMAL）
  importStatus: 'none' | 'attached' | 'trace_saved';
}

export interface KnowledgeNote {
  intention?: string;
  result?: string;
  learning?: string;
}

/** 公開設定。shared = Give-to-Get 相互閲覧の対象（BUSINESS_PLAN Phase 0c） */
export type SetupVisibility = 'private' | 'shared';

export interface CarSetup {
  id?: string;
  userId: string;
  driver: Maybe<string>;     // ドライバー名（新規追加: WP1指摘#3）
  visibility?: SetupVisibility; // 省略時は 'private'（旧データ互換）
  anonymized?: boolean;         // 共有時にドライバー特定情報を除外する
  carModel: string;
  vehicleId?: Maybe<string>; // 登録車両との紐付け（任意）
  vehicleProfileSnapshot?: Maybe<PublicVehicleProfile>; // 保存時点の公開用プロフィール
  circuit: string;
  date: Date;                // セッション日時。保存値を表示し、新規時のみ現在日時を初期値
  sessionType: 'practice' | 'qualifying' | 'race';
  weather: WeatherCondition;
  tireSettings: TireSettings;
  tireInfo: TireInfo;
  sessionInfo: SessionInfo;
  suspensionSettings?: SuspensionSettings;
  alignmentSettings?: AlignmentSettings;
  targetPressures?: TargetPressures; // 目標温間圧（省略可 = 旧データ互換）
  notes?: string;
  knowledge?: KnowledgeNote;
  lapTimeData?: LapTimeData;
  telemetry?: SetupTelemetryRefs;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
}

// 車両関連の型定義
export interface Vehicle {
  id?: string;
  userId: string;
  make: string; // メーカー（Honda, Toyota等）
  model: string; // モデル（S2000, Supra等）
  year: number; // 年式
  grade?: string; // グレード
  vin?: string; // VINコード
  licensePlate?: string; // ナンバープレート
  color?: string; // 色
  mileage?: number; // 走行距離
  engineType?: string; // エンジン型式
  transmission?: string; // トランスミッション
  drivetrain?: string; // 駆動方式（FR, FF, AWD等）
  photoURL?: string; // 車両写真
  notes?: string; // 備考
  setupConfig?: VehicleSetupConfig; // セッティング可能項目
  isActive: boolean; // アクティブフラグ
  createdAt: Date;
  updatedAt: Date;
}

// 車両のセッティング可能項目の設定
export interface VehicleSetupConfig {
  // サスペンション設定
  suspension: {
    damperAdjustable: boolean; // ダンパー調整可否
    damperClicksFront?: number; // フロントダンパー段数
    damperClicksRear?: number; // リアダンパー段数
    heightAdjustable: boolean; // 車高調整可否
    heightRangeFront?: { min: number; max: number }; // フロント車高調整範囲
    heightRangeRear?: { min: number; max: number }; // リア車高調整範囲
    springRateChangeable: boolean; // スプリングレート変更可否
    antiRollBarAdjustable: boolean; // スタビライザー調整可否
  };

  // アライメント設定
  alignment: {
    camberAdjustable: boolean; // キャンバー調整可否
    camberRangeFront?: { min: number; max: number };
    camberRangeRear?: { min: number; max: number };
    toeAdjustable: boolean; // トー調整可否
    toeRangeFront?: { min: number; max: number };
    toeRangeRear?: { min: number; max: number };
    casterAdjustable: boolean; // キャスター調整可否
    casterRange?: { min: number; max: number };
  };

  // タイヤ設定
  tire: {
    frontSize: string[]; // フロント対応サイズ
    rearSize: string[]; // リア対応サイズ
    recommendedPressure?: {
      frontMin: number;
      frontMax: number;
      rearMin: number;
      rearMax: number;
    };
  };

  // ブレーキ設定
  brake: {
    padTypes: string[]; // 対応パッドタイプ
    rotorTypes?: string[]; // 対応ロータータイプ
  };

  // エンジン設定
  engine?: {
    ecuTunable: boolean; // ECUチューニング可否
    boostAdjustable?: boolean; // ブースト調整可否
    boostRange?: { min: number; max: number };
  };

  // その他のカスタム設定
  customSettings?: Record<string, any>;
}
