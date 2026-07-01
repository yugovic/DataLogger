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
  profile?: VehicleProfile; // 車両プロフィール
  isActive: boolean; // アクティブフラグ
  createdAt: Date;
  updatedAt: Date;
}

// タイヤ区分（クラス判定の主軸）
export type TireClass = 'S_TIRE' | 'HIGH_GRIP_RADIAL' | 'RADIAL';

export const TIRE_CLASS_LABELS: Record<TireClass, string> = {
  S_TIRE: 'Sタイヤ',
  HIGH_GRIP_RADIAL: 'ハイグリップラジアル',
  RADIAL: 'ラジアル',
};

// 改造カテゴリ
export type ModCategory =
  | 'intake_exhaust'
  | 'forced_induction'
  | 'suspension'
  | 'brake'
  | 'aero'
  | 'weight_reduction'
  | 'ecu'
  | 'drivetrain'
  | 'engine_internal'
  | 'tire_wheel'
  | 'body_reinforcement'
  | 'other';

export const MOD_CATEGORY_LABELS: Record<ModCategory, string> = {
  intake_exhaust: '吸排気',
  forced_induction: '過給',
  suspension: '足回り',
  brake: 'ブレーキ',
  aero: 'エアロ',
  weight_reduction: '軽量化',
  ecu: 'ECU・電装',
  drivetrain: '駆動系',
  engine_internal: 'エンジン内部',
  tire_wheel: 'タイヤ・ホイール',
  body_reinforcement: 'ボディ補強',
  other: 'その他',
};

// 改造パーツ申告エントリ
export interface ModificationEntry {
  id: string; // クライアント生成の一意ID
  category: ModCategory;
  partName: string; // パーツ名
  maker: string | null; // メーカー名
  installedAt: Date | null; // 装着日
  removedAt: Date | null; // 取外し日（null = 現在も装着中）
  costJPY: number | null; // 費用
  memo: string | null; // 自由メモ
}

// 車両プロフィール
export interface VehicleProfile {
  modifications: ModificationEntry[];
  tireClass: TireClass | null;
  powerPs: number | null;
  weightKg: number | null;
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
    rotorTypes?: string[]; // 対応ローター タイプ
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
