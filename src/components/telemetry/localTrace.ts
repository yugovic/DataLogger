import {
  buildLapProfile,
  buildTelemetryTraceFromImport,
  deriveCompareSeries,
} from '../../lib/telemetry';
import type { Lap, LapProfile } from '../../lib/telemetry';
import { makeLocalProjection } from '../../lib/telemetry/geo';
import type { CarSetup } from '../../types/setup';
import type { TelemetryTrace, TelemetryTraceInput } from '../../types/telemetryTrace';
import type { SingleLapPath } from './SingleLapTelemetryView';
import type { TelemetryImportResult } from './useTelemetryImport';

const emptyWeather = {
  condition: null,
  airTemp: null,
  trackTemp: null,
  humidity: null,
  pressure: null,
};

const emptyTireSettings = {
  fl: { before: null, after: null },
  fr: { before: null, after: null },
  rl: { before: null, after: null },
  rr: { before: null, after: null },
};

const emptyTargetPressures = {
  front: null,
  rear: null,
};

function buildSetupContext(
  result: TelemetryImportResult,
  baseTrace?: TelemetryTrace | null,
): Pick<
  CarSetup,
  | 'carModel'
  | 'circuit'
  | 'date'
  | 'sessionType'
  | 'weather'
  | 'tireInfo'
  | 'tireSettings'
  | 'targetPressures'
  | 'sessionInfo'
  | 'notes'
> {
  return {
    carModel: baseTrace?.carModel ?? 'ローカル比較',
    circuit: result.track?.name ?? baseTrace?.circuit ?? 'コース未判定',
    date: result.session.meta.startTimestamp ?? baseTrace?.sessionDate ?? new Date(),
    sessionType: baseTrace?.sessionType ?? 'practice',
    weather: baseTrace?.conditions.weather ?? emptyWeather,
    tireInfo: baseTrace?.conditions.tireInfo ?? { brand: '', compound: '' },
    tireSettings: baseTrace?.conditions.tireSettings ?? emptyTireSettings,
    targetPressures: baseTrace?.conditions.targetPressures ?? emptyTargetPressures,
    sessionInfo: { distance: null, fuel: baseTrace?.conditions.fuel ?? null },
    notes: baseTrace?.conditions.notes ?? '',
  };
}

export function defaultComparableLapIndex(result: TelemetryImportResult | null): number | null {
  if (!result) return null;
  if (result.detection.bestLapIndex !== null) return result.detection.bestLapIndex;
  const firstNormal = result.detection.laps.findIndex((lap) => lap.type === 'NORMAL');
  return firstNormal >= 0 ? firstNormal : null;
}

export function defaultInspectableLapIndex(result: TelemetryImportResult | null): number | null {
  if (!result || result.detection.laps.length === 0) return null;
  const comparable = defaultComparableLapIndex(result);
  if (comparable !== null) return comparable;
  return result.detection.laps.reduce((longest, lap, i) => (
    lap.timeSeconds > result.detection.laps[longest].timeSeconds ? i : longest
  ), 0);
}

export function comparableLaps(result: TelemetryImportResult | null): Lap[] {
  return result?.detection.laps.filter((lap) => lap.type === 'NORMAL') ?? [];
}

export interface LocalLapInspection {
  lap: Lap;
  profile: LapProfile;
  path?: SingleLapPath;
}

export function buildLocalLapInspection(params: {
  result: TelemetryImportResult;
  lapIndex: number | null;
}): LocalLapInspection | null {
  if (params.lapIndex === null) return null;
  const lap = params.result.detection.laps[params.lapIndex];
  if (!lap) return null;
  const compareSeries = deriveCompareSeries(params.result.session.points);
  const profile = buildLapProfile(
    params.result.session.points,
    compareSeries.distance,
    compareSeries.longG,
    compareSeries.latG,
    lap,
  );
  if (profile.distance.length < 2 || profile.lapLengthM <= 0) return null;
  return { lap, profile, path: buildPathForLap(params.result, lap) };
}

function buildPathForLap(result: TelemetryImportResult, lap: Lap): SingleLapPath | undefined {
  const origin = firstGpsPointInLap(result, lap);
  if (!origin) return undefined;
  const { toXY } = makeLocalProjection(origin);
  const xM: number[] = [];
  const yM: number[] = [];
  for (const p of result.session.points) {
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    if (p.lat === null || p.lon === null) continue;
    const xy = toXY({ lat: p.lat, lon: p.lon });
    xM.push(roundPath(xy.x));
    yM.push(roundPath(xy.y));
  }
  return xM.length >= 2 ? { xM, yM, origin } : undefined;
}

function firstGpsPointInLap(result: TelemetryImportResult, lap: Lap): { lat: number; lon: number } | null {
  for (const p of result.session.points) {
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    if (p.lat !== null && p.lon !== null) return { lat: p.lat, lon: p.lon };
  }
  return null;
}

function roundPath(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildLocalTelemetryTrace(params: {
  result: TelemetryImportResult;
  lapIndex: number | null;
  slot: 'A' | 'B';
  baseTrace?: TelemetryTrace | null;
}): TelemetryTrace | null {
  if (params.lapIndex === null) return null;

  const input = buildTelemetryTraceFromImport({
    ownerId: params.baseTrace?.ownerId ?? 'local',
    setupId: params.baseTrace?.setupId ?? '',
    setup: buildSetupContext(params.result, params.baseTrace),
    fileName: params.result.fileName,
    fileSizeBytes: params.result.fileSizeBytes,
    session: params.result.session,
    detection: params.result.detection,
    trackId: params.result.track?.id ?? params.baseTrace?.trackId ?? null,
    lineSource: params.result.lineSource,
    lapIndex: params.lapIndex,
  });

  if (!input) return null;
  const now = new Date();
  return {
    ...input,
    id: `local-${params.slot}-${params.result.fileName}-${params.lapIndex}`,
    createdAt: now,
    updatedAt: now,
  } satisfies TelemetryTraceInput & Pick<TelemetryTrace, 'id' | 'createdAt' | 'updatedAt'>;
}
