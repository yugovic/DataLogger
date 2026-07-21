// テレメトリ取込パイプライン hook（WP5）
//
// ファイル読込 → フォーマット判別/パース → サーキット照合 → ラップ検出 を
// 段階的に実行する。各段階の間でイベントループへ制御を返し（setTimeout 0）、
// 大きなファイルでも進行表示が描画されるようにする。
// ライン解決とラップ検出の決定ロジックは resolveLapDetection.ts（純関数）参照。

import { useCallback, useRef, useState } from 'react';
import { parseTelemetryFile, TelemetryParseError } from '../../lib/telemetry';
import type { LapDetectionResult, StartFinishLine, TelemetrySession } from '../../lib/telemetry';
import type { Track } from '../../lib/tracks';
import { trackEvent } from '../../lib/analytics';
import logger from '../../utils/logger';
import { resolveLapDetection } from './resolveLapDetection';
import type { LineSource } from './resolveLapDetection';

export type { LineSource } from './resolveLapDetection';

/** 取込の進行段階 */
export type ImportPhase = 'idle' | 'reading' | 'parsing' | 'detecting' | 'done' | 'error';

/** 進行段階の表示ラベル（i18n キー。表示側で t() する） */
export const PHASE_LABEL_KEYS: Record<Exclude<ImportPhase, 'idle' | 'done' | 'error'>, string> = {
  reading: 'telemetry.importProgress.reading',
  parsing: 'telemetry.importProgress.parsing',
  detecting: 'telemetry.importProgress.detecting',
};

/** 取込成功時の結果一式 */
export interface TelemetryImportResult {
  fileName: string;
  fileSizeBytes: number;
  session: TelemetrySession;
  /** 推定された走行サーキット（DB 照合不能時は null） */
  track: Track | null;
  /** ラップ検出に使用したライン（検出不能時は null） */
  line: StartFinishLine | null;
  /** ライン出所（'estimated' のときは UI で「基準線は自動推定」を明示する） */
  lineSource: LineSource | null;
  detection: LapDetectionResult;
}

/** イベントループへ制御を返し、進行表示の描画を許す */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * テレメトリファイル取込の状態機械。
 * importFile を呼ぶたびに前回の結果を破棄して最初から実行する。
 */
export function useTelemetryImport() {
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [result, setResult] = useState<TelemetryImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 連続取込時に古い実行の setState が新しい実行を上書きしないためのガード
  const runIdRef = useRef(0);

  const reset = useCallback(() => {
    runIdRef.current++;
    setPhase('idle');
    setResult(null);
    setError(null);
  }, []);

  const importFile = useCallback(async (file: File) => {
    const runId = ++runIdRef.current;
    const isCurrent = () => runId === runIdRef.current;
    setResult(null);
    setError(null);
    setPhase('reading');

    try {
      const buffer = await file.arrayBuffer();
      if (!isCurrent()) return;

      setPhase('parsing');
      await yieldToUi();
      if (!isCurrent()) return;
      const session = parseTelemetryFile(file.name, buffer);

      setPhase('detecting');
      await yieldToUi();
      if (!isCurrent()) return;

      const { track, line, lineSource, detection } = resolveLapDetection(session);

      if (!isCurrent()) return;
      setResult({
        fileName: file.name,
        fileSizeBytes: file.size,
        session,
        track,
        line,
        lineSource,
        detection,
      });
      setPhase('done');

      if (detection.laps.length === 0) {
        void trackEvent('lap_detection_failed', {
          format: session.meta.format,
          reason: line ? 'no_complete_laps' : 'no_start_finish_line',
        });
      }

      // 計測: 取込成功（KPI: 証憑つきデータの生成数）
      trackEvent('telemetry_imported', {
        format: session.meta.format,
        circuit: track?.name,
      });
    } catch (e) {
      if (!isCurrent()) return;
      logger.error('Telemetry import failed:', e);
      setError(
        e instanceof TelemetryParseError
          ? e.message
          : 'telemetry.importProgress.unexpectedError',
      );
      setPhase('error');
      void trackEvent('telemetry_attach_failed', {
        reason: e instanceof TelemetryParseError ? 'parse_error' : 'unexpected_error',
      });
    }
  }, []);

  return {
    phase,
    result,
    error,
    /** 処理中（ファイル選択を無効化する等に使う） */
    busy: phase === 'reading' || phase === 'parsing' || phase === 'detecting',
    importFile,
    reset,
  };
}
