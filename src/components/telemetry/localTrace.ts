import { buildTelemetryTraceFromImport } from '../../lib/telemetry';
import type { Lap } from '../../lib/telemetry';
import type { CarSetup } from '../../types/setup';
import type { TelemetryTrace, TelemetryTraceInput } from '../../types/telemetryTrace';
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

export function comparableLaps(result: TelemetryImportResult | null): Lap[] {
  return result?.detection.laps.filter((lap) => lap.type === 'NORMAL') ?? [];
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
