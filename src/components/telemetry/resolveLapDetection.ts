// コントロールライン解決とラップ検出の決定ロジック（WP5、UI非依存の純関数）
//
// src/lib/tracks.ts 冒頭コメントの運用方針に従う:
//   1. guessTrack で走行サーキットを推定し、DB のラインでラップ検出
//   2. DB ラインで交差が1本も取れない（座標未校正コース等）、または
//      コース不明の場合は estimateStartFinishLine（軌跡からの自動推定）へ
//      フォールバック
//   3. それでも切れなければ「周回検出不能」として正直に空を返す
//      （ラップタイムの捏造はしない）

import { detectLaps, estimateStartFinishLine } from '../../lib/telemetry';
import type { LapDetectionResult, StartFinishLine, TelemetrySession } from '../../lib/telemetry';
import { guessTrack } from '../../lib/tracks';
import type { Track } from '../../lib/tracks';

/** ラップ検出に使ったコントロールラインの出所 */
export type LineSource = 'db' | 'estimated';

export interface ResolvedLapDetection {
  /** 推定された走行サーキット（DB 照合不能時は null） */
  track: Track | null;
  /** ラップ検出に使用したライン（検出を試みられなかった場合は null） */
  line: StartFinishLine | null;
  /** ライン出所（'estimated' のときは UI で「基準線は自動推定」を明示する） */
  lineSource: LineSource | null;
  detection: LapDetectionResult;
}

const EMPTY_DETECTION: LapDetectionResult = { laps: [], bestLapIndex: null, crossingTimes: [] };

/**
 * セッションの GPS 軌跡からサーキット・コントロールラインを解決し、
 * ラップ検出結果を返す。
 */
export function resolveLapDetection(session: TelemetrySession): ResolvedLapDetection {
  const track = guessTrack(session.points);
  let line: StartFinishLine | null = track?.startFinishLine ?? null;
  let lineSource: LineSource | null = line ? 'db' : null;
  let detection = line
    ? detectLaps(session.points, line, { minLapSeconds: track?.minLapSeconds })
    : EMPTY_DETECTION;

  // DB ラインで1本も交差が取れない（座標未校正等）→ 軌跡からの自動推定
  if (detection.crossingTimes.length === 0) {
    const estimated = estimateStartFinishLine(session.points, {
      minLapSeconds: track?.minLapSeconds,
    });
    if (estimated) {
      line = estimated;
      lineSource = 'estimated';
      detection = detectLaps(session.points, estimated, {
        minLapSeconds: track?.minLapSeconds,
      });
    }
  }

  return { track, line, lineSource, detection };
}
