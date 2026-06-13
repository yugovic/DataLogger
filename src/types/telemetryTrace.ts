import type { CarSetup, LapType, TireInfo, TireSettings, WeatherCondition, TargetPressures } from './setup';
import type { TelemetryFormat } from '../lib/telemetry/types';

export type TelemetryTraceVisibility = 'private' | 'shared' | 'market_preview' | 'market_paid' | 'team';
export type TelemetryLineSource = 'db' | 'estimated' | 'manual' | null;
export type TelemetryTraceQuality = 'raw' | 'verified' | 'commentary';

export interface TelemetryTraceQualityFlags {
  gpsDropout: boolean;
  estimatedLine: boolean;
  singleLapFile: boolean;
  lowSampleRate: boolean;
  missingOperationChannels: boolean;
}

export interface TelemetryTrace {
  id?: string;
  ownerId: string;
  setupId: string;

  visibility: TelemetryTraceVisibility;
  anonymized: boolean;

  carModel: string;
  trackId: string | null;
  circuit: string;
  sessionDate: Date;
  sessionType: CarSetup['sessionType'];

  source: {
    fileName: string;
    fileSizeBytes: number;
    format: TelemetryFormat;
    importedAt: Date;
    parserVersion: string;
    sampleRateHz: number | null;
    lineSource: TelemetryLineSource;
  };

  lap: {
    lapNumber: number;
    type: LapType;
    timeSeconds: number;
    valid: boolean;
    invalidReason?: string | null;
  };

  conditions: {
    weather: WeatherCondition;
    tireInfo: TireInfo;
    tireSettings: TireSettings;
    targetPressures?: TargetPressures;
    fuel: number | null;
    notes?: string;
  };

  channels: {
    distanceM: number[];
    elapsedS: number[];
    speedKmh: number[];
    longG?: number[];
    latG?: number[];
    throttlePct?: number[];
    brakePct?: number[];
    steeringDeg?: number[];
    rpm?: number[];
    gear?: number[];
  };

  path?: {
    xM: number[];
    yM: number[];
    origin: { lat: number; lon: number };
  };

  summary: {
    topSpeedKmh: number | null;
    minCornerSpeedKmh: number | null;
    maxBrakeG: number | null;
    maxLatG: number | null;
    sectorTimes?: { sectorId: string; name: string; timeSeconds: number }[];
    coachSummary?: string;
  };

  qualityFlags: TelemetryTraceQualityFlags;

  market?: {
    productId: string | null;
    quality: TelemetryTraceQuality;
    priceJPY?: number;
    sellerId?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export type TelemetryTraceInput = Omit<TelemetryTrace, 'id' | 'createdAt' | 'updatedAt'>;
