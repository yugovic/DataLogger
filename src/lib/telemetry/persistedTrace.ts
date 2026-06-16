// 保存済み比較トレース変換 — Phase B1
//
// 生ログ全体ではなく、ラップ単位の距離グリッドへ間引いたチャンネルだけを
// Firestore に保存する。NORMAL ラップは後日の比較対象に、OUT/IN しかない
// 1ラップ切り出しログは単独確認用の走行ログとして扱う。

import type { CarSetup } from '../../types/setup';
import type { TelemetryTraceInput } from '../../types/telemetryTrace';
import {
  buildDistanceGrid,
  buildLapProfile,
  computeLapMetrics,
  deriveCompareSeries,
  interpolateAt,
  type LapProfile,
} from './compare';
import { makeLocalProjection } from './geo';
import type { Lap, LapDetectionResult, TelemetrySession } from './types';

export const TELEMETRY_TRACE_PARSER_VERSION = 'telemetry-trace-v1';

export interface BuildTelemetryTraceInput {
  ownerId: string;
  setupId: string;
  setup: Pick<
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
  >;
  fileName: string;
  fileSizeBytes: number;
  session: TelemetrySession;
  detection: LapDetectionResult;
  trackId: string | null;
  lineSource: 'db' | 'estimated' | null;
  lapIndex?: number;
  stepM?: number;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sampleSeries(profile: LapProfile, values: readonly number[], grid: readonly number[], digits: number): number[] {
  const series = { distance: profile.distance, value: Array.from(values) };
  return grid.map((d) => {
    const v = interpolateAt(series, d);
    return v === null ? 0 : round(v, digits);
  });
}

export function downsampleLapProfile(profile: LapProfile, stepM = 10): TelemetryTraceInput['channels'] {
  const grid = buildDistanceGrid(profile.lapLengthM, stepM);
  return {
    distanceM: grid.map((v) => round(v, 2)),
    elapsedS: sampleSeries(profile, profile.elapsed, grid, 3),
    speedKmh: sampleSeries(profile, profile.speed, grid, 2),
    longG: sampleSeries(profile, profile.longG, grid, 3),
    latG: sampleSeries(profile, profile.latG, grid, 3),
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

function downsamplePath(
  session: TelemetrySession,
  sessionDistance: readonly number[],
  lap: Lap,
  grid: readonly number[],
): TelemetryTraceInput['path'] | undefined {
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

  const xM = grid.map((d) => round(interpolateAt({ distance, value: xs }, d) ?? 0, 2));
  const yM = grid.map((d) => round(interpolateAt({ distance, value: ys }, d) ?? 0, 2));
  return { xM, yM, origin };
}

function lapGpsDropout(session: TelemetrySession, lap: Lap): boolean {
  let total = 0;
  let missing = 0;
  for (const p of session.points) {
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    total++;
    if (p.lat === null || p.lon === null) missing++;
  }
  return total > 0 && missing / total > 0.1;
}

export function buildTelemetryTraceFromImport(input: BuildTelemetryTraceInput): TelemetryTraceInput | null {
  const lapIndex = input.lapIndex ?? input.detection.bestLapIndex ?? longestLapIndex(input.detection.laps);
  if (lapIndex === null || lapIndex === undefined) return null;
  const lap = input.detection.laps[lapIndex];
  if (!lap) return null;

  const compareSeries = deriveCompareSeries(input.session.points);
  const profile = buildLapProfile(
    input.session.points,
    compareSeries.distance,
    compareSeries.longG,
    compareSeries.latG,
    lap,
  );
  if (profile.distance.length < 2 || profile.lapLengthM <= 0) return null;

  const channels = downsampleLapProfile(profile, input.stepM ?? 10);
  const metrics = computeLapMetrics(profile, lap.timeSeconds);
  const path = downsamplePath(input.session, compareSeries.distance, lap, channels.distanceM);
  const normalLaps = input.detection.laps.filter((l) => l.type === 'NORMAL').length;
  const isComparableLap = lap.type === 'NORMAL';

  return {
    ownerId: input.ownerId,
    setupId: input.setupId,
    visibility: 'private',
    anonymized: false,
    carModel: input.setup.carModel,
    trackId: input.trackId,
    circuit: input.setup.circuit,
    sessionDate: input.setup.date,
    sessionType: input.setup.sessionType,
    source: {
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      format: input.session.meta.format,
      importedAt: new Date(),
      parserVersion: TELEMETRY_TRACE_PARSER_VERSION,
      sampleRateHz: input.session.meta.sampleRateHz,
      lineSource: input.lineSource,
    },
    lap: {
      lapNumber: lap.lapNumber,
      type: lap.type,
      timeSeconds: round(lap.timeSeconds, 3),
      valid: isComparableLap,
      invalidReason: isComparableLap
        ? null
        : 'S/Fライン通過で閉じたNORMALラップではないため、比較ではなく単独確認用として保存しました',
    },
    conditions: {
      weather: input.setup.weather,
      tireInfo: input.setup.tireInfo,
      tireSettings: input.setup.tireSettings,
      targetPressures: input.setup.targetPressures,
      fuel: input.setup.sessionInfo.fuel,
      notes: input.setup.notes,
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
      gpsDropout: lapGpsDropout(input.session, lap),
      estimatedLine: input.lineSource === 'estimated',
      singleLapFile: normalLaps <= 1 && input.detection.crossingTimes.length < 3,
      lowSampleRate: input.session.meta.sampleRateHz !== null && input.session.meta.sampleRateHz < 2,
      missingOperationChannels: true,
    },
  };
}

function longestLapIndex(laps: readonly Lap[]): number | null {
  if (laps.length === 0) return null;
  return laps.reduce((bestIndex, lap, index) => (
    lap.timeSeconds > laps[bestIndex].timeSeconds ? index : bestIndex
  ), 0);
}

export function traceToLapProfile(trace: Pick<TelemetryTraceInput, 'channels'>): LapProfile {
  const { channels } = trace;
  const distance = channels.distanceM;
  return {
    distance,
    elapsed: channels.elapsedS,
    speed: channels.speedKmh,
    longG: channels.longG ?? distance.map(() => 0),
    latG: channels.latG ?? distance.map(() => 0),
    lapLengthM: distance.length > 0 ? distance[distance.length - 1] : 0,
  };
}
