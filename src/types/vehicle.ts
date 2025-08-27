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