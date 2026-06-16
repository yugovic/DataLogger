import type { TelemetryTrace } from '../../types/telemetryTrace';
import {
  buildLapProfile,
  computeLapMetrics,
  deriveCompareSeries,
  downsampleLapProfile,
  interpolateAt,
  parseTelemetryFile,
  TELEMETRY_TRACE_PARSER_VERSION,
  type Lap,
  type TelemetrySession,
} from '../../lib/telemetry';
import { makeLocalProjection } from '../../lib/telemetry/geo';
import { resolveLapDetection } from './resolveLapDetection';

export const SAMPLE_TELEMETRY_TRACE_ID = 'sample-amuse-z34-ooi-0013';
export const SAMPLE_TELEMETRY_SETUP_ID = 'sample-setup-amuse-z34-ooi-0013';

const SAMPLE_FILE_NAME = 'amuse_Z34_Ooi_0013_2_21_711.dtb';
const SAMPLE_FILE_SIZE_BYTES = 90880;
const SAMPLE_FILE_URL = new URL('../demo/SampleData/amuse_Z34_Ooi_0013_2_21_711.dtb', import.meta.url).href;

let sampleBasePromise: Promise<Omit<TelemetryTrace, 'ownerId'>> | null = null;

export function isSampleTelemetryTraceId(traceId: string | null | undefined): boolean {
  return traceId === SAMPLE_TELEMETRY_TRACE_ID;
}

export async function getSampleTelemetryTrace(ownerId = 'sample-user'): Promise<TelemetryTrace> {
  if (!sampleBasePromise) sampleBasePromise = buildSampleTelemetryTraceBase();
  const base = await sampleBasePromise;
  return { ...base, ownerId };
}

async function buildSampleTelemetryTraceBase(): Promise<Omit<TelemetryTrace, 'ownerId'>> {
  const response = await fetch(SAMPLE_FILE_URL);
  if (!response.ok) {
    throw new Error(`サンプルロガーファイルを読み込めませんでした: ${response.status}`);
  }

  const session = parseTelemetryFile(SAMPLE_FILE_NAME, await response.arrayBuffer());
  const resolved = resolveLapDetection(session);
  const lap = buildWholeFileLap(session);
  const compareSeries = deriveCompareSeries(session.points);
  const profile = buildLapProfile(
    session.points,
    compareSeries.distance,
    compareSeries.longG,
    compareSeries.latG,
    lap,
  );
  const channels = downsampleLapProfile(profile, 10);
  const metrics = computeLapMetrics(profile, lap.timeSeconds);
  const path = downsamplePath(session, compareSeries.distance, lap, channels.distanceM);
  const sessionDate = session.meta.startTimestamp ?? new Date('2012-12-13T01:59:37Z');

  return {
    id: SAMPLE_TELEMETRY_TRACE_ID,
    setupId: SAMPLE_TELEMETRY_SETUP_ID,
    visibility: 'private',
    anonymized: false,
    carModel: 'Nissan Fairlady Z Z34 / amuse',
    trackId: resolved.track?.id ?? 'suzuka-full',
    circuit: resolved.track?.name ?? '鈴鹿サーキット（国際レーシングコース）',
    sessionDate,
    sessionType: 'practice',
    source: {
      fileName: SAMPLE_FILE_NAME,
      fileSizeBytes: SAMPLE_FILE_SIZE_BYTES,
      format: session.meta.format,
      importedAt: sessionDate,
      parserVersion: TELEMETRY_TRACE_PARSER_VERSION,
      sampleRateHz: session.meta.sampleRateHz,
      lineSource: resolved.lineSource,
    },
    lap: {
      lapNumber: 13,
      type: 'OUT',
      timeSeconds: round(lap.timeSeconds, 3),
      valid: false,
      invalidReason: '1ラップ切り出しサンプルのため、S/Fライン通過で閉じたNORMALラップとしては扱いません',
    },
    conditions: {
      weather: {
        condition: '晴れ',
        airTemp: null,
        trackTemp: null,
        humidity: null,
        pressure: null,
      },
      tireInfo: {
        brand: 'Sample',
        compound: 'Unknown',
      },
      tireSettings: {
        fl: { before: null, after: null },
        fr: { before: null, after: null },
        rl: { before: null, after: null },
        rr: { before: null, after: null },
      },
      targetPressures: {
        front: null,
        rear: null,
      },
      fuel: null,
      notes: '同梱サンプル: DigiSpice .dtb の1ラップ切り出しログ',
    },
    channels,
    path,
    summary: {
      topSpeedKmh: metrics.topSpeedKmh !== null ? round(metrics.topSpeedKmh, 2) : null,
      minCornerSpeedKmh: metrics.minCornerSpeedKmh !== null ? round(metrics.minCornerSpeedKmh, 2) : null,
      maxBrakeG: metrics.maxBrakingG,
      maxLatG: metrics.maxLatG,
    },
    qualityFlags: {
      gpsDropout: false,
      estimatedLine: resolved.lineSource === 'estimated',
      singleLapFile: true,
      lowSampleRate: session.meta.sampleRateHz !== null && session.meta.sampleRateHz < 2,
      missingOperationChannels: true,
    },
    createdAt: sessionDate,
    updatedAt: sessionDate,
  };
}

function buildWholeFileLap(session: TelemetrySession): Lap {
  const first = session.points[0];
  const last = session.points[session.points.length - 1];
  const startTime = first?.time ?? 0;
  const endTime = last?.time ?? startTime;
  return {
    lapNumber: 13,
    startTime,
    endTime,
    timeSeconds: Math.max(0.001, endTime - startTime),
    type: 'OUT',
  };
}

function downsamplePath(
  session: TelemetrySession,
  sessionDistance: readonly number[],
  lap: Lap,
  grid: readonly number[],
): TelemetryTrace['path'] | undefined {
  const origin = firstGpsPointInLap(session, lap);
  if (!origin) return undefined;
  const { toXY } = makeLocalProjection(origin);

  const distance: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  let baseDist: number | null = null;
  for (let i = 0; i < session.points.length; i++) {
    const p = session.points[i];
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    if (p.lat === null || p.lon === null) continue;
    if (baseDist === null) baseDist = sessionDistance[i];
    const xy = toXY({ lat: p.lat, lon: p.lon });
    distance.push(sessionDistance[i] - baseDist);
    xs.push(xy.x);
    ys.push(xy.y);
  }
  if (distance.length < 2) return undefined;

  return {
    xM: grid.map((d) => round(interpolateAt({ distance, value: xs }, d) ?? 0, 2)),
    yM: grid.map((d) => round(interpolateAt({ distance, value: ys }, d) ?? 0, 2)),
    origin,
  };
}

function firstGpsPointInLap(session: TelemetrySession, lap: Lap): { lat: number; lon: number } | null {
  for (const p of session.points) {
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    if (p.lat !== null && p.lon !== null) return { lat: p.lat, lon: p.lon };
  }
  return null;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
