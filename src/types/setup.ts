// セットアップデータの型定義
// 原則: 未入力は null。0 や '' への変換・デモ値での充填を禁止する

import type { PublicVehicleProfile } from '../lib/vehicleProfilePublic';
import type {
  SetupAdjustmentGroup,
  SetupAdjustmentPosition,
  SetupAdjustmentValueType,
} from './vehicle';

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

export type WeatherCode = 'sunny' | 'cloudy' | 'wet' | 'full_wet';
export type LegacyWeatherType = '晴れ' | '曇り' | 'ウェット' | 'フルウェット';
/** 旧日本語値は読取互換のため保持する。新規実装では WeatherCode を使用する。 */
export type WeatherType = WeatherCode | LegacyWeatherType;

export interface WeatherCondition {
  condition: Maybe<WeatherType>;
  airTemp: Maybe<number>;
  trackTemp: Maybe<number>;
  humidity: Maybe<number>;
  pressure: Maybe<number>;
}

export interface TireInfo {
  /** 旧データ互換。新規保存では manufacturer と同じ値を入れる。 */
  brand: string;
  manufacturer?: string;
  productName?: string;
  compound: string;
  frontSize?: string;
  rearSize?: string;
  tireSetId?: string;
  tireSetCode?: string;
}

export interface TireUsage {
  /** 1セッションでタイヤを常温から使用温度まで上げた回数。 */
  heatCyclesAdded: Maybe<number>;
}

export interface BrakeSettings {
  frontPad: string;
  rearPad: string;
  frontRotor: string;
  rearRotor: string;
  balance: Maybe<number>; // フロント配分率 (%)
}

export interface AeroSettings {
  front: Maybe<number>; // 装置固有の段数・位置
  rear: Maybe<number>;
}

export interface EngineSettings {
  ecuMap: string;
  boost: Maybe<number>; // kPa
}

/**
 * 1セッション時点の可変セッティング値。
 * label/unit/group/position は車両定義変更後も過去記録を解釈できるよう保存時点をスナップショットする。
 */
export interface SetupAdjustmentValue {
  definitionId: string;
  group: SetupAdjustmentGroup;
  label: string;
  position: SetupAdjustmentPosition;
  valueType: SetupAdjustmentValueType;
  unit?: string;
  value: number | string | boolean | null;
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

/**
 * ドライバー評価（走行フィードバック）。
 * 各値は 0〜4 の主観評価、未入力は null。
 * 原則: デモ初期値（1〜3等）を保存しない。ユーザーが操作した項目だけ number になる。
 */
export interface DrivingFeedback {
  lowSpeedEntry: Maybe<number>;
  lowSpeedMiddle: Maybe<number>;
  lowSpeedExit: Maybe<number>;
  highSpeedEntry: Maybe<number>;
  highSpeedMiddle: Maybe<number>;
  highSpeedExit: Maybe<number>;
  brakeInitial: Maybe<number>;
  brakeMiddle: Maybe<number>;
  brakeStability: Maybe<number>;
  accelResponse: Maybe<number>;
  accelTraction: Maybe<number>;
  balance: Maybe<number>;
  confidence: Maybe<number>;
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
  tireUsage?: TireUsage;
  sessionInfo: SessionInfo;
  suspensionSettings?: SuspensionSettings;
  alignmentSettings?: AlignmentSettings;
  brakeSettings?: BrakeSettings;
  aeroSettings?: AeroSettings;
  engineSettings?: EngineSettings;
  adjustmentValues?: SetupAdjustmentValue[];
  targetPressures?: TargetPressures; // 目標温間圧（省略可 = 旧データ互換）
  notes?: string;
  knowledge?: KnowledgeNote;
  drivingFeedback?: DrivingFeedback; // ドライバー評価（省略可 = 未評価。デモ初期値は保存しない）
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
