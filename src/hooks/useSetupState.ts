// セットアップ情報の状態管理カスタムフック
import { useState } from 'react';

// タイヤ空気圧の型定義
export interface TirePressure {
  before: string;
  after: string;
  diff: string;
}

export interface TirePressures {
  fl: TirePressure;
  fr: TirePressure;
  rl: TirePressure;
  rr: TirePressure;
}

// ダンパー設定の型定義
export interface DamperSetting {
  bump: number;
  rebound: number;
}

export interface DamperSettings {
  fl: DamperSetting;
  fr: DamperSetting;
  rl: DamperSetting;
  rr: DamperSetting;
}

// 基本情報の型定義
export interface BasicInfo {
  weatherCondition: string;
  airTemp: string;
  trackTemp: string;
  humidity: string;
  pressure: string;
  tireBrand: string;
  tireCompound: string;
  distance: string;
  fuel: string;
}

// サスペンション設定の型定義
export interface SuspensionSettings {
  frontDamperCompression: number;
  frontDamperRebound: number;
  rearDamperCompression: number;
  rearDamperRebound: number;
  frontSpringRate: string;
  rearSpringRate: string;
  frontRideHeight: string;
  rearRideHeight: string;
  frontStabilizer: string;
  rearStabilizer: string;
}

// アライメント設定の型定義
export interface AlignmentSettings {
  frontCamber: string;
  rearCamber: string;
  frontToe: string;
  rearToe: string;
  caster: string;
}

// ドライビング情報の型定義
export interface DrivingInfo {
  notes: string;
}

// 全体の状態の型定義
export interface SetupState {
  sessionDate: string;
  circuit: string;
  car: string;
  driver: string;
  sessionType: string;
  basicInfo: BasicInfo;
  tirePressures: TirePressures;
  damperSettings: DamperSettings;
  suspension: SuspensionSettings;
  alignment: AlignmentSettings;
  driving: DrivingInfo;
}

// カスタムフック
export const useSetupState = () => {
  // セッション情報
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [circuit, setCircuit] = useState('');
  const [car, setCar] = useState('');
  const [driver, setDriver] = useState('');
  const [sessionType, setSessionType] = useState('走行会');

  // 基本情報
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    weatherCondition: '晴れ',
    airTemp: '24',
    trackTemp: '33',
    humidity: '75',
    pressure: '1008',
    tireBrand: 'ADVAN',
    tireCompound: 'A050',
    distance: '120',
    fuel: '30'
  });

  // タイヤ空気圧
  const [tirePressures, setTirePressures] = useState<TirePressures>({
    fl: { before: "190", after: "215", diff: "+25" },
    fr: { before: "190", after: "218", diff: "+28" },
    rl: { before: "185", after: "210", diff: "+25" },
    rr: { before: "185", after: "213", diff: "+28" }
  });

  // ダンパー設定
  const [damperSettings, setDamperSettings] = useState<DamperSettings>({
    fl: { bump: 8, rebound: 10 },
    fr: { bump: 8, rebound: 10 },
    rl: { bump: 7, rebound: 9 },
    rr: { bump: 7, rebound: 9 }
  });

  // サスペンション設定
  const [suspension, setSuspension] = useState<SuspensionSettings>({
    frontDamperCompression: 10,
    frontDamperRebound: 10,
    rearDamperCompression: 10,
    rearDamperRebound: 10,
    frontSpringRate: '8.0',
    rearSpringRate: '6.0',
    frontRideHeight: '120',
    rearRideHeight: '125',
    frontStabilizer: '22',
    rearStabilizer: '20'
  });

  // アライメント設定
  const [alignment, setAlignment] = useState<AlignmentSettings>({
    frontCamber: '-2.5',
    rearCamber: '-1.5',
    frontToe: '0',
    rearToe: '2',
    caster: '5.5'
  });

  // ドライビング情報
  const [driving, setDriving] = useState<DrivingInfo>({
    notes: ''
  });

  // 基本情報の更新関数
  const updateBasicInfo = (field: keyof BasicInfo, value: string) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }));
  };

  // サスペンション設定の更新関数
  const updateSuspension = (field: keyof SuspensionSettings, value: string | number) => {
    setSuspension(prev => ({ ...prev, [field]: value }));
  };

  // アライメント設定の更新関数
  const updateAlignment = (field: keyof AlignmentSettings, value: string) => {
    setAlignment(prev => ({ ...prev, [field]: value }));
  };

  // 全体の状態を取得
  const getFullState = (): SetupState => ({
    sessionDate,
    circuit,
    car,
    driver,
    sessionType,
    basicInfo,
    tirePressures,
    damperSettings,
    suspension,
    alignment,
    driving
  });

  return {
    // セッション情報
    sessionDate,
    setSessionDate,
    circuit,
    setCircuit,
    car,
    setCar,
    driver,
    setDriver,
    sessionType,
    setSessionType,

    // 基本情報
    basicInfo,
    updateBasicInfo,

    // タイヤ空気圧
    tirePressures,
    setTirePressures,

    // ダンパー設定
    damperSettings,
    setDamperSettings,

    // サスペンション
    suspension,
    updateSuspension,

    // アライメント
    alignment,
    updateAlignment,

    // ドライビング
    driving,
    setDriving,

    // 全体
    getFullState
  };
};