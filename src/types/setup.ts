// セットアップデータの型定義

export interface TirePressure {
  before: number;
  after: number;
  diff?: number;
}

export interface TireSettings {
  fl: TirePressure;
  fr: TirePressure;
  rl: TirePressure;
  rr: TirePressure;
}

export type WeatherType = '晴れ' | '曇り' | 'ウェット' | 'フルウェット';

export interface WeatherCondition {
  condition: WeatherType;
  airTemp: number;
  trackTemp: number;
  humidity: number;
  pressure: number;
}

export interface TireInfo {
  brand: string;
  compound: string;
}

export interface SessionInfo {
  distance: number;
  fuel: number;
}

export interface SuspensionSettings {
  frontDamper: {
    compression: number;
    rebound: number;
  };
  rearDamper: {
    compression: number;
    rebound: number;
  };
  springRate: {
    front: number;
    rear: number;
  };
  rideHeight: {
    front: number;
    rear: number;
  };
  antiRollBar: {
    front: number;
    rear: number;
  };
}

export interface AlignmentSettings {
  camber: {
    front: number;
    rear: number;
  };
  toe: {
    front: number;
    rear: number;
  };
  caster: number;
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
  bestLap?: string;
  totalLaps?: number;
  laps?: LapTime[];
}

export interface CarSetup {
  id?: string;
  userId: string;
  carModel: string;
  circuit: string;
  date: Date;
  sessionType: 'practice' | 'qualifying' | 'race';
  weather: WeatherCondition;
  tireSettings: TireSettings;
  tireInfo: TireInfo;
  sessionInfo: SessionInfo;
  suspensionSettings?: SuspensionSettings;
  alignmentSettings?: AlignmentSettings;
  notes?: string;
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