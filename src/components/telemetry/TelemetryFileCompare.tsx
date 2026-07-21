import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Empty } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons';
import { Header } from '../common/Header';
import { DropZone, ImportErrorPanel, ImportProgress, SessionSummaryPanel } from './ImportPanels';
import { LapList, type LapSlot } from './LapList';
import { PersistedTraceComparison } from './PersistedTraceComparison';
import { calcLapMaxSpeeds } from './lapMetrics';
import {
  buildLocalLapInspection,
  buildLocalTelemetryTrace,
  defaultInspectableLapIndex,
} from './localTrace';
import { SingleLapTelemetryView } from './SingleLapTelemetryView';
import { useTelemetryImport } from './useTelemetryImport';

type ImportController = ReturnType<typeof useTelemetryImport>;

export const TelemetryFileCompare: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  const importA = useTelemetryImport();
  const importB = useTelemetryImport();
  const [pendingA, setPendingA] = useState<string | undefined>(undefined);
  const [pendingB, setPendingB] = useState<string | undefined>(undefined);
  const [lapA, setLapA] = useState<number | null>(null);
  const [lapB, setLapB] = useState<number | null>(null);

  useEffect(() => {
    setLapA(defaultInspectableLapIndex(importA.result));
  }, [importA.result]);

  useEffect(() => {
    setLapB(defaultInspectableLapIndex(importB.result));
  }, [importB.result]);

  const traceA = useMemo(
    () => (importA.result ? buildLocalTelemetryTrace({ result: importA.result, lapIndex: lapA, slot: 'A' }) : null),
    [importA.result, lapA],
  );
  const traceB = useMemo(
    () => (importB.result ? buildLocalTelemetryTrace({ result: importB.result, lapIndex: lapB, slot: 'B' }) : null),
    [importB.result, lapB],
  );
  const inspectionA = useMemo(
    () => (importA.result ? buildLocalLapInspection({ result: importA.result, lapIndex: lapA }) : null),
    [importA.result, lapA],
  );
  const inspectionB = useMemo(
    () => (importB.result ? buildLocalLapInspection({ result: importB.result, lapIndex: lapB }) : null),
    [importB.result, lapB],
  );

  const canCompare = traceA !== null && traceB !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-4"
        >
          <ArrowLeftOutlined className="mr-1" />
          {t('telemetry.fileCompare.back')}
        </button>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <SwapOutlined className="text-xl text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('telemetry.fileCompare.title')}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('telemetry.fileCompare.description')}
            </p>
          </div>
          <Link
            to="/telemetry/import"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t('telemetry.fileCompare.toSameFileLapCompare')}
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
          <FileCompareSlot
            slot="A"
            label={t('telemetry.fileCompare.slotALabel')}
            colorClass="text-blue-500"
            controller={importA}
            pendingFileName={pendingA}
            selectedLap={lapA}
            onSelectedLap={setLapA}
            onFile={(file) => {
              setPendingA(file.name);
              importA.importFile(file);
            }}
            onReset={() => {
              setPendingA(undefined);
              setLapA(null);
              importA.reset();
            }}
          />
          <FileCompareSlot
            slot="B"
            label={t('telemetry.fileCompare.slotBLabel')}
            colorClass="text-amber-500"
            controller={importB}
            pendingFileName={pendingB}
            selectedLap={lapB}
            onSelectedLap={setLapB}
            onFile={(file) => {
              setPendingB(file.name);
              importB.importFile(file);
            }}
            onReset={() => {
              setPendingB(undefined);
              setLapB(null);
              importB.reset();
            }}
          />
        </div>

        {canCompare ? (
          <PersistedTraceComparison traceA={traceA} traceB={traceB} />
        ) : inspectionA || inspectionB ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {inspectionA && importA.result && (
              <SingleLapTelemetryView
                title={t('telemetry.fileCompare.slotASelectedLapTitle')}
                description={t('telemetry.fileCompare.singleLapDescriptionA')}
                profile={inspectionA.profile}
                lapTimeSeconds={inspectionA.lap.timeSeconds}
                lapNumber={inspectionA.lap.lapNumber}
                lapType={inspectionA.lap.type}
                circuit={importA.result.track?.name ?? t('telemetry.fileCompare.trackUndetermined')}
                fileName={importA.result.fileName}
                sourceLabel={importA.result.session.meta.format}
                path={inspectionA.path}
                trackMap={importA.result.track?.map}
              />
            )}
            {inspectionB && importB.result && (
              <SingleLapTelemetryView
                title={t('telemetry.fileCompare.slotBSelectedLapTitle')}
                description={t('telemetry.fileCompare.singleLapDescriptionB')}
                profile={inspectionB.profile}
                lapTimeSeconds={inspectionB.lap.timeSeconds}
                lapNumber={inspectionB.lap.lapNumber}
                lapType={inspectionB.lap.type}
                circuit={importB.result.track?.name ?? t('telemetry.fileCompare.trackUndetermined')}
                fileName={importB.result.fileName}
                sourceLabel={importB.result.session.meta.format}
                path={inspectionB.path}
                trackMap={importB.result.track?.map}
              />
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-10">
            <Empty
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  {t('telemetry.fileCompare.emptyPrompt')}
                </span>
              }
            />
          </div>
        )}
      </main>
    </div>
  );
};

interface FileCompareSlotProps {
  slot: LapSlot;
  label: string;
  colorClass: string;
  controller: ImportController;
  pendingFileName?: string;
  selectedLap: number | null;
  onSelectedLap: (index: number | null) => void;
  onFile: (file: File) => void;
  onReset: () => void;
}

const FileCompareSlot: React.FC<FileCompareSlotProps> = ({
  slot,
  label,
  colorClass,
  controller,
  pendingFileName,
  selectedLap,
  onSelectedLap,
  onFile,
  onReset,
}) => {
  const { t } = useTranslation();
  const { phase, result, error, busy } = controller;
  const maxSpeeds = useMemo(
    () => (result ? calcLapMaxSpeeds(result.session.points, result.detection.laps) : []),
    [result],
  );
  const selection = useMemo(
    () => (selectedLap === null ? {} : ({ [slot]: selectedLap } as Partial<Record<LapSlot, number>>)),
    [selectedLap, slot],
  );

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className={`text-sm font-semibold ${colorClass}`}>{label}</h3>
        {phase === 'done' && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ReloadOutlined />
            {t('telemetry.fileCompare.anotherFile')}
          </button>
        )}
      </div>

      {(phase === 'idle' || busy) && (
        <div className="space-y-3">
          <DropZone onFile={onFile} disabled={busy} />
          <ImportProgress phase={phase} fileName={pendingFileName} />
        </div>
      )}

      {phase === 'error' && error && <ImportErrorPanel message={error} onRetry={onReset} />}

      {phase === 'done' && result && (
        <div className="space-y-3">
          <SessionSummaryPanel result={result} />
          {result.detection.laps.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('telemetry.fileCompare.displayLap')}
                </span>
                <span className="text-[11px] text-gray-400">
                  {t('telemetry.fileCompare.selectNormalHint')}
                </span>
              </div>
              <LapList
                laps={result.detection.laps}
                bestLapIndex={result.detection.bestLapIndex}
                maxSpeeds={maxSpeeds}
                selection={selection}
                onSelect={(index) => {
                  onSelectedLap(result.detection.laps[index] ? index : null);
                }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-5 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('telemetry.fileCompare.noLapsAvailable')}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t('telemetry.fileCompare.noLapsHint')}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
