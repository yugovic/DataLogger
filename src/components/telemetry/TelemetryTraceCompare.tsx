import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Empty, Select, Spin, Tag, message } from 'antd';
import { ArrowLeftOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { Header } from '../common/Header';
import { PersistedTraceComparison } from './PersistedTraceComparison';
import type { TelemetryTrace } from '../../types/telemetryTrace';
import {
  getComparableTraceCandidates,
  getTelemetryTrace,
  type ComparableTraceCandidate,
} from '../../services/telemetryTraceService';
import logger from '../../utils/logger';
import { DropZone, ImportErrorPanel, ImportProgress, SessionSummaryPanel } from './ImportPanels';
import { LapList } from './LapList';
import { calcLapMaxSpeeds } from './lapMetrics';
import {
  buildLocalTelemetryTrace,
  comparableLaps,
  defaultComparableLapIndex,
} from './localTrace';
import { useTelemetryImport } from './useTelemetryImport';

export const TelemetryTraceCompare: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const aTraceId = params.get('aTrace');
  const bTraceId = params.get('bTrace');

  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [traceA, setTraceA] = useState<TelemetryTrace | null>(null);
  const [traceB, setTraceB] = useState<TelemetryTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [candidateNotice, setCandidateNotice] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ComparableTraceCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(bTraceId);
  const [candidateLabel, setCandidateLabel] = useState<string | null>(null);
  const uploadB = useTelemetryImport();
  const [pendingUploadName, setPendingUploadName] = useState<string | undefined>(undefined);
  const [uploadLapIndex, setUploadLapIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!aTraceId) {
        setLoadError('比較元のテレメトリトレースが指定されていません');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      setCandidateNotice(null);
      setCandidates([]);
      setCandidateLabel(null);
      try {
        const a = await getTelemetryTrace(aTraceId);
        if (!a) {
          setLoadError('比較元のテレメトリトレースが見つかりません');
          return;
        }
        const nextCandidates = await getComparableTraceCandidates(a);
        setCandidates(nextCandidates);
        const b = bTraceId ? await getTelemetryTrace(bTraceId) : nextCandidates[0]?.trace ?? null;
        if (!b) {
          setTraceA(a);
          setTraceB(null);
          if (bTraceId) {
            setLoadError('比較対象のテレメトリトレースが見つかりません');
          } else {
            setCandidateNotice('同じ車種・コースの保存済み比較候補がまだありません');
          }
          return;
        }
        setTraceA(a);
        setTraceB(b);
        setSelectedCandidateId(b.id ?? null);
        setCandidateLabel(nextCandidates.find((candidate) => candidate.trace.id === b.id)?.label ?? (bTraceId ? '指定ラップ' : null));
      } catch (error) {
        logger.error('保存済みテレメトリ比較の読み込みに失敗しました:', error);
        setLoadError('保存済みテレメトリ比較の読み込みに失敗しました');
        message.error('保存済みテレメトリ比較の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [aTraceId, bTraceId]);

  const handleCandidateChange = async (traceId: string) => {
    setSelectedCandidateId(traceId);
    const candidate = candidates.find((item) => item.trace.id === traceId);
    if (candidate) {
      setTraceB(candidate.trace);
      setCandidateLabel(candidate.label);
      return;
    }
    try {
      const nextTrace = await getTelemetryTrace(traceId);
      if (!nextTrace) {
        message.error('比較対象のトレースが見つかりません');
        return;
      }
      setTraceB(nextTrace);
      setCandidateLabel('指定ラップ');
    } catch (error) {
      logger.error('比較対象の切り替えに失敗しました:', error);
      message.error('比較対象の切り替えに失敗しました');
    }
  };

  useEffect(() => {
    setUploadLapIndex(defaultComparableLapIndex(uploadB.result));
  }, [uploadB.result]);

  const uploadedTraceB = useMemo(
    () => (
      traceA && uploadB.result
        ? buildLocalTelemetryTrace({
          result: uploadB.result,
          lapIndex: uploadLapIndex,
          slot: 'B',
          baseTrace: traceA,
        })
        : null
    ),
    [traceA, uploadB.result, uploadLapIndex],
  );

  const comparisonTraceB = uploadedTraceB ?? traceB;

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
          戻る
        </button>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">保存済みテレメトリ比較</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              取り込んで保存した比較用トレースを、過去の自分のベストや指定ラップと重ねます。
            </p>
          </div>
          {candidateLabel && !uploadedTraceB && (
            <Tag color="blue" className="w-fit">
              比較対象: {candidateLabel}
            </Tag>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          </div>
        ) : loadError || !traceA ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  {loadError ?? '比較できません'}
                </span>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      保存済みB候補
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      自己ベスト、前回、条件が近いログを自動候補にします。下でファイルをアップロードした場合はアップロードBを優先します。
                    </p>
                  </div>
                  <Select
                    value={selectedCandidateId ?? undefined}
                    onChange={handleCandidateChange}
                    className="w-full sm:w-96 sm:ml-auto"
                    options={candidates
                      .filter((candidate) => candidate.trace.id)
                      .map((candidate) => ({
                        value: candidate.trace.id as string,
                        label: `${candidate.label} - ${candidate.description}`,
                      }))}
                  />
                </div>
              </section>
            )}

            <UploadComparisonTarget
              controller={uploadB}
              pendingFileName={pendingUploadName}
              selectedLap={uploadLapIndex}
              onSelectedLap={setUploadLapIndex}
              onFile={(file) => {
                setPendingUploadName(file.name);
                uploadB.importFile(file);
              }}
              onReset={() => {
                setPendingUploadName(undefined);
                setUploadLapIndex(null);
                uploadB.reset();
              }}
            />

            {comparisonTraceB ? (
              <PersistedTraceComparison traceA={traceA} traceB={comparisonTraceB} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
                <Empty
                  description={
                    <span className="text-gray-500 dark:text-gray-400">
                      {candidateNotice ?? '比較対象のトレースがありません。上のエリアから比較ファイルをアップロードできます。'}
                    </span>
                  }
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

interface UploadComparisonTargetProps {
  controller: ReturnType<typeof useTelemetryImport>;
  pendingFileName?: string;
  selectedLap: number | null;
  onSelectedLap: (index: number | null) => void;
  onFile: (file: File) => void;
  onReset: () => void;
}

const UploadComparisonTarget: React.FC<UploadComparisonTargetProps> = ({
  controller,
  pendingFileName,
  selectedLap,
  onSelectedLap,
  onFile,
  onReset,
}) => {
  const { phase, result, error, busy } = controller;
  const maxSpeeds = useMemo(
    () => (result ? calcLapMaxSpeeds(result.session.points, result.detection.laps) : []),
    [result],
  );
  const normalLaps = comparableLaps(result);
  const selection = useMemo(
    () => (selectedLap === null ? {} : ({ B: selectedLap } as const)),
    [selectedLap],
  );

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            アップロードしたファイルをBとして比較
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            手元の前回ログ、共有されたログ、サンプルログを読み込むと、保存済みAの自己ベスト候補より優先して表示します。
          </p>
        </div>
        {phase === 'done' && (
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ReloadOutlined />
            別ファイル
          </button>
        )}
      </div>

      {(phase === 'idle' || busy) && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-4 items-start">
          <DropZone onFile={onFile} disabled={busy} />
          <ImportProgress phase={phase} fileName={pendingFileName} />
        </div>
      )}

      {phase === 'error' && error && <ImportErrorPanel message={error} onRetry={onReset} />}

      {phase === 'done' && result && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_1fr] gap-4">
          <SessionSummaryPanel result={result} />
          {normalLaps.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bに使うラップ
                </span>
                <span className="text-[11px] text-gray-400">NORMALラップのみ比較対象</span>
              </div>
              <LapList
                laps={result.detection.laps}
                bestLapIndex={result.detection.bestLapIndex}
                maxSpeeds={maxSpeeds}
                selection={selection}
                onSelect={(index) => {
                  const lap = result.detection.laps[index];
                  onSelectedLap(lap?.type === 'NORMAL' ? index : null);
                }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-5 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">比較できるNORMALラップがありません</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                コントロールラインを2回以上通過した走行データを選択してください。
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
