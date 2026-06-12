// セットアップデータの型定義
// 原則: 未入力は null。0 や '' への変換・デモ値での充填を禁止する

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

export interface LapTimeData {
  bestLap?: Maybe<string>;
  totalLaps?: Maybe<number>;
  laps?: LapTime[];
}

export interface KnowledgeNote {
  intention?: string;
  result?: string;
  learning?: string;
}

export interface CarSetup {
  id?: string;
  userId: string;
  driver: Maybe<string>;     // ドライバー名（新規追加: WP1指摘#3）
  carModel: string;
  circuit: string;
  date: Date;                // セッション日時。保存値を表示し、新規時のみ現在日時を初期値
  sessionType: 'practice' | 'qualifying' | 'race';
  weather: WeatherCondition;
  tireSettings: TireSettings;
  tireInfo: TireInfo;
  sessionInfo: SessionInfo;
  suspensionSettings?: SuspensionSettings;
  alignmentSettings?: AlignmentSettings;
  notes?: string;
  knowledge?: KnowledgeNote;
  lapTimeData?: LapTimeData;
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
