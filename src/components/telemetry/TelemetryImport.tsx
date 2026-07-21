// ロガー取込フロー（WP5）— ファイル選択 → パース → サーキット自動判定 →
// ラップ一覧 → セットアップ記録への添付。
// CarSetup.tsx のラップタイムセクションからモーダルとして呼び出される。

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PaperClipOutlined, ReloadOutlined } from '@ant-design/icons';
import { buildAttachPayload } from './evidence';
import type { LapAttachPayload } from './evidence';
import { calcLapMaxSpeeds } from './lapMetrics';
import { LapList } from './LapList';
import { DropZone, ImportErrorPanel, ImportProgress, SessionSummaryPanel } from './ImportPanels';
import { useTelemetryImport } from './useTelemetryImport';
import type { TelemetryImportResult } from './useTelemetryImport';

interface TelemetryImportProps {
  /** 「このセットアップに添付」確定時に呼ばれる */
  onAttach: (payload: LapAttachPayload, result: TelemetryImportResult) => void;
}

export const TelemetryImport: React.FC<TelemetryImportProps> = ({ onAttach }) => {
  const { t } = useTranslation();
  const { phase, result, error, busy, importFile, reset } = useTelemetryImport();
  const [pendingFileName, setPendingFileName] = useState<string | undefined>(undefined);

  const maxSpeeds = useMemo(
    () => (result ? calcLapMaxSpeeds(result.session.points, result.detection.laps) : []),
    [result],
  );

  const handleFile = (file: File) => {
    setPendingFileName(file.name);
    importFile(file);
  };

  const handleAttach = () => {
    if (!result) return;
    onAttach(
      buildAttachPayload(result.detection, {
        fileName: result.fileName,
        format: result.session.meta.format,
        trackId: result.track?.id ?? null,
      }),
      result,
    );
  };

  const hasLaps = (result?.detection.laps.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {(phase === 'idle' || busy) && (
        <>
          <DropZone onFile={handleFile} disabled={busy} />
          <ImportProgress phase={phase} fileName={pendingFileName} />
        </>
      )}

      {phase === 'error' && error && <ImportErrorPanel message={error} onRetry={reset} />}

      {phase === 'done' && result && (
        <>
          <SessionSummaryPanel result={result} />

          {hasLaps ? (
            <LapList
              laps={result.detection.laps}
              bestLapIndex={result.detection.bestLapIndex}
              maxSpeeds={maxSpeeds}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('telemetry.importPage.noLapsTitle')}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                {t('telemetry.importPage.noLapsDescription')}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <ReloadOutlined />
              {t('telemetry.importPage.importAnother')}
            </button>
            <button
              onClick={handleAttach}
              disabled={!hasLaps}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasLaps
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <PaperClipOutlined />
              {t('telemetry.importPage.attachToSetup')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
