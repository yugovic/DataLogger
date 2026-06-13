// テレメトリモジュール公開 API — VELOCITY LOGGER ロガー連携コア (WP4)
//
// 利用例（WP5 取込フロー想定）:
//   const session = parseTelemetryFile(file.name, await file.arrayBuffer());
//   const track = guessTrack(session.points);            // src/lib/tracks.ts
//   const line = track?.startFinishLine ?? estimateStartFinishLine(session.points);
//   const result = line ? detectLaps(session.points, line,
//     { minLapSeconds: track?.minLapSeconds }) : EMPTY;

export {
  TelemetryParseError,
  type Lap,
  type LapDetectionResult,
  type LapType,
  type LatLon,
  type StartFinishLine,
  type TelemetryFormat,
  type TelemetryMeta,
  type TelemetryPoint,
  type TelemetrySession,
} from './types';

export { parseAimCsv } from './parseAimCsv';
export { parseDigiSpiceDtb, readExtended80, looksLikeDtb } from './parseDigiSpiceDtb';
export { parseNmeaRmc } from './parseNmeaRmc';
export { detectFormat, parseTelemetryFile } from './detectFormat';
export { calcCumulativeDistance, calcLongG, estimateSampleRateHz } from './derive';
export {
  detectLaps,
  estimateStartFinishLine,
  cleanGpsPoints,
  type DetectLapsOptions,
  type EstimateLineOptions,
} from './detectLaps';
export { haversineMeters, bearingDeg } from './geo';
export {
  interpolateAt,
  buildDistanceGrid,
  resampleOnGrid,
  type DistanceSeries,
} from './resample';
export {
  channelAvailability,
  calcLatG,
  buildLapProfile,
  deriveCompareSeries,
  deltaT,
  computeLapMetrics,
  computeSegmentDeltas,
  readoutAt,
  positionAt,
  type ChannelKey,
  type ChannelAvailability,
  type LapProfile,
  type DeltaTPoint,
  type DeltaTResult,
  type LapMetrics,
  type SegmentDelta,
  type CursorReadout,
} from './compare';
export {
  buildCoachingReadout,
  type Annotation,
  type AnnotationKind,
  type CoachingReadout,
} from './annotations';
export {
  TELEMETRY_TRACE_PARSER_VERSION,
  buildTelemetryTraceFromImport,
  downsampleLapProfile,
  traceToLapProfile,
  type BuildTelemetryTraceInput,
} from './persistedTrace';
