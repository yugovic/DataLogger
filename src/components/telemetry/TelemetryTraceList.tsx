import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Empty, Select, Spin, Tag, message } from 'antd';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LoadingOutlined,
  SearchOutlined,
  SwapOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Header } from '../common/Header';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTelemetryTraces } from '../../services/telemetryTraceService';
import { getSetup } from '../../services/setupService';
import type { CarSetup } from '../../types/setup';
import type { TelemetryTrace, TelemetryTraceQualityFlags } from '../../types/telemetryTrace';
import {
  buildCoachingReadout,
  computeLapMetrics,
  computeSegmentDeltas,
  deltaT,
  traceToLapProfile,
  type CoachingReadout,
  type DeltaTResult,
  type LapProfile,
} from '../../lib/telemetry';
import { buildCompareSections, compareRow } from '../../lib/setupFields';
import { findTrackById } from '../../lib/tracks';
import { formatLapSeconds } from './evidence';
import { isSampleTelemetryTraceId, SAMPLE_TELEMETRY_SETUP_ID } from './sampleTelemetryTrace';
import logger from '../../utils/logger';
import telemetryMockCarUrl from '../../assets/telemetry-mock-car.png';

type TraceQualityTone = 'verified' | 'usable' | 'limited';
type PreviewCandidateKind = 'self_best' | 'previous' | 'condition_match';
type ChannelKey = 'speedKmh' | 'throttlePct' | 'brakePct' | 'steeringDeg' | 'gear';

interface PreviewCandidate {
  trace: TelemetryTrace;
  kind: PreviewCandidateKind;
  label: string;
  description: string;
  score: number;
  deltaSeconds: number;
}

interface PreviewModel {
  reference: PreviewCandidate;
  referenceProfile: LapProfile;
  currentProfile: LapProfile;
  delta: DeltaTResult;
  coaching: CoachingReadout;
  finalDelta: number;
}

interface SetupDiffItem {
  section: string;
  label: string;
  aDisplay: string;
  bDisplay: string;
  delta: number | null;
}

interface TraceBucket {
  key: string;
  circuit: string;
  carModel: string;
  trackId: string | null;
  traces: TelemetryTrace[];
  bestTrace: TelemetryTrace | null;
  lastTrace: TelemetryTrace | null;
  validNormalCount: number;
  qualityTone: TraceQualityTone;
}

const NO_COMPARISON = '__no_comparison__';

export const TelemetryTraceList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBucketKey = searchParams.get('bucket');

  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [traces, setTraces] = useState<TelemetryTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCircuit, setFilterCircuit] = useState<string | null>(null);
  const [filterCarModel, setFilterCarModel] = useState<string | null>(null);
  const [filterQuality, setFilterQuality] = useState<TraceQualityTone | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [highlightedBucketKey, setHighlightedBucketKey] = useState<string | null>(null);
  const [selectedTraceKey, setSelectedTraceKey] = useState<string | null>(null);
  const [comparisonTraceKey, setComparisonTraceKey] = useState<string | null>(null);
  const [setupDiffs, setSetupDiffs] = useState<SetupDiffItem[]>([]);
  const [setupDiffLoading, setSetupDiffLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = await getUserTelemetryTraces(currentUser.uid);
        setTraces(list);
      } catch (error) {
        logger.error('走行ログ一覧の取得に失敗しました:', error);
        const isPermissionDenied = typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: unknown }).code === 'permission-denied';
        message.error(
          isPermissionDenied
            ? '走行ログ一覧の取得権限がありません。Firestore rules の telemetryTraces 設定とデプロイ状態を確認してください。'
            : '走行ログ一覧の取得に失敗しました',
          6,
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const circuitOptions = useMemo(() => countOptions(traces.map((trace) => trace.circuit)), [traces]);
  const carOptions = useMemo(() => countOptions(traces.map((trace) => trace.carModel)), [traces]);

  const filteredTraces = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return traces.filter((trace) => {
      if (filterCircuit && trace.circuit !== filterCircuit) return false;
      if (filterCarModel && trace.carModel !== filterCarModel) return false;
      if (filterQuality && qualityTone(trace.qualityFlags) !== filterQuality) return false;
      if (filterVisibility && trace.visibility !== filterVisibility) return false;
      if (query) {
        const haystack = [
          trace.circuit,
          trace.carModel,
          trace.sessionType,
          trace.source.fileName,
          trace.source.format,
          trace.conditions.tireInfo.brand,
          trace.conditions.tireInfo.compound,
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [
    traces,
    filterCircuit,
    filterCarModel,
    filterQuality,
    filterVisibility,
    searchText,
  ]);

  const buckets = useMemo(() => buildTraceBuckets(filteredTraces), [filteredTraces]);
  const selectedBucket = useMemo(
    () => buckets.find((bucket) => bucket.key === selectedBucketKey) ?? null,
    [buckets, selectedBucketKey],
  );

  useEffect(() => {
    if (buckets.length === 0) {
      setHighlightedBucketKey(null);
      return;
    }
    if (!highlightedBucketKey || !buckets.some((bucket) => bucket.key === highlightedBucketKey)) {
      setHighlightedBucketKey(buckets[0].key);
    }
  }, [buckets, highlightedBucketKey]);

  useEffect(() => {
    if (!selectedBucketKey || loading) return;
    if (!selectedBucket) {
      setSearchParams({});
    }
  }, [loading, selectedBucket, selectedBucketKey, setSearchParams]);

  useEffect(() => {
    if (!selectedBucket) return;
    const defaultTrace = selectedBucket.lastTrace ?? selectedBucket.bestTrace ?? selectedBucket.traces[0] ?? null;
    if (!defaultTrace) return;
    if (!selectedTraceKey || !selectedBucket.traces.some((trace) => traceKey(trace) === selectedTraceKey)) {
      setSelectedTraceKey(traceKey(defaultTrace));
      setComparisonTraceKey(null);
    }
  }, [selectedBucket, selectedTraceKey]);

  const selectedTrace = useMemo(() => {
    if (!selectedBucket) return null;
    return selectedBucket.traces.find((trace) => traceKey(trace) === selectedTraceKey) ?? selectedBucket.lastTrace ?? selectedBucket.traces[0] ?? null;
  }, [selectedBucket, selectedTraceKey]);

  useEffect(() => {
    if (!selectedBucket || !selectedTrace) {
      setComparisonTraceKey(null);
      return;
    }
    const validExisting = comparisonTraceKey
      ? selectedBucket.traces.some((trace) => traceKey(trace) === comparisonTraceKey && traceKey(trace) !== traceKey(selectedTrace))
      : false;
    if (validExisting) return;
    const defaultReference = buildDefaultComparisonTrace(selectedTrace, selectedBucket.traces);
    setComparisonTraceKey(defaultReference ? traceKey(defaultReference) : null);
  }, [comparisonTraceKey, selectedBucket, selectedTrace]);

  const comparisonTrace = useMemo(() => {
    if (!selectedBucket || !selectedTrace || !comparisonTraceKey) return null;
    const next = selectedBucket.traces.find((trace) => traceKey(trace) === comparisonTraceKey) ?? null;
    return next && traceKey(next) !== traceKey(selectedTrace) ? next : null;
  }, [comparisonTraceKey, selectedBucket, selectedTrace]);

  const referenceCandidate = useMemo(
    () => (selectedBucket && selectedTrace && comparisonTrace
      ? buildReferenceCandidate(selectedTrace, comparisonTrace, selectedBucket.traces)
      : null),
    [comparisonTrace, selectedBucket, selectedTrace],
  );

  const preview = useMemo<PreviewModel | null>(() => {
    if (!selectedTrace || !comparisonTrace || !referenceCandidate) return null;
    try {
      const referenceProfile = traceToLapProfile(comparisonTrace);
      const currentProfile = traceToLapProfile(selectedTrace);
      const d = deltaT(referenceProfile, currentProfile, 10);
      const metricsReference = computeLapMetrics(referenceProfile, comparisonTrace.lap.timeSeconds);
      const metricsCurrent = computeLapMetrics(currentProfile, selectedTrace.lap.timeSeconds);
      const segments = computeSegmentDeltas(d, 3);
      const coaching = buildCoachingReadout(d, metricsReference, metricsCurrent, segments);
      return {
        reference: referenceCandidate,
        referenceProfile,
        currentProfile,
        delta: d,
        coaching,
        finalDelta: d.finalDelta,
      };
    } catch (error) {
      logger.error('走行ログプレビューの計算に失敗しました:', error);
      return null;
    }
  }, [comparisonTrace, referenceCandidate, selectedTrace]);

  useEffect(() => {
    let cancelled = false;
    const loadDiffs = async () => {
      setSetupDiffs([]);
      if (!selectedTrace || !comparisonTrace) return;
      if (!isSetupLoadable(selectedTrace.setupId) || !isSetupLoadable(comparisonTrace.setupId)) return;
      setSetupDiffLoading(true);
      try {
        const [currentSetup, referenceSetup] = await Promise.all([
          getSetup(selectedTrace.setupId),
          getSetup(comparisonTrace.setupId),
        ]);
        if (cancelled) return;
        setSetupDiffs(currentSetup && referenceSetup ? buildSetupDiffs(referenceSetup, currentSetup).slice(0, 8) : []);
      } catch (error) {
        if (!cancelled) {
          logger.error('走行ログプレビューのセット差分取得に失敗しました:', error);
          setSetupDiffs([]);
        }
      } finally {
        if (!cancelled) setSetupDiffLoading(false);
      }
    };
    loadDiffs();
    return () => {
      cancelled = true;
    };
  }, [comparisonTrace, selectedTrace]);

  const highlightedBucket = useMemo(
    () => buckets.find((bucket) => bucket.key === highlightedBucketKey) ?? buckets[0] ?? null,
    [buckets, highlightedBucketKey],
  );

  const compareUrl = selectedTrace?.id
    ? comparisonTrace?.id
      ? `/telemetry/compare?aTrace=${comparisonTrace.id}&bTrace=${selectedTrace.id}`
      : `/telemetry/compare?aTrace=${selectedTrace.id}`
    : '/telemetry/compare';

  const openBucket = (bucketKeyValue: string) => {
    setSearchParams({ bucket: bucketKeyValue });
  };

  const backToBuckets = () => {
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />

      <main className="max-w-[1800px] mx-auto py-4 px-3 sm:px-4 lg:px-5">
        <div className="mb-4 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-gray-400 dark:text-gray-500">
              Telemetry Library
            </div>
            <div className="flex items-center gap-2 mt-1">
              <BarChartOutlined className="text-xl text-blue-500" />
              <h2 className="text-3xl sm:text-4xl font-black leading-none text-gray-900 dark:text-gray-50">
                走行ログ
              </h2>
            </div>
            <div className="mt-2 h-0.5 w-9 bg-red-500" />
          </div>

          <div className="flex flex-col items-stretch xl:items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="h-9 min-w-[260px] sm:min-w-[340px] flex items-center gap-2 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <SearchOutlined />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="車種・トラックを検索"
                  className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none"
                />
              </label>
              <Select
                value={filterCarModel}
                onChange={setFilterCarModel}
                placeholder="車種: すべて"
                allowClear
                showSearch
                className="min-w-36"
                options={carOptions}
              />
              <Select
                value={filterCircuit}
                onChange={setFilterCircuit}
                placeholder="トラック: すべて"
                allowClear
                showSearch
                className="min-w-40"
                options={circuitOptions}
              />
              <Select
                value={filterQuality}
                onChange={setFilterQuality}
                placeholder="Quality"
                allowClear
                className="min-w-32"
                options={[
                  { value: 'verified', label: 'Verified' },
                  { value: 'usable', label: 'Usable' },
                  { value: 'limited', label: 'Limited' },
                ]}
              />
              <Select
                value={filterVisibility}
                onChange={setFilterVisibility}
                placeholder="公開範囲"
                allowClear
                className="min-w-32"
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'shared', label: 'Shared' },
                  { value: 'team', label: 'Team' },
                  { value: 'market_preview', label: 'Market Preview' },
                  { value: 'market_paid', label: 'Market Paid' },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2">
              <Button icon={<SwapOutlined />} onClick={() => navigate('/telemetry/files')}>
                2ファイル比較
              </Button>
              <Button type="primary" icon={<UploadOutlined />} onClick={() => navigate('/telemetry/import')}>
                ロガーを追加
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          </div>
        ) : traces.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-12">
            <Empty
              description={<span className="text-gray-500 dark:text-gray-400">走行ログがまだありません</span>}
            >
              <Button type="primary" icon={<UploadOutlined />} onClick={() => navigate('/telemetry/import')}>
                最初のロガーを追加
              </Button>
            </Empty>
          </div>
        ) : buckets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-12">
            <Empty description={<span className="text-gray-500 dark:text-gray-400">条件に一致する組み合わせがありません</span>} />
          </div>
        ) : selectedBucket ? (
          <AnalysisWorkspace
            bucket={selectedBucket}
            selectedTrace={selectedTrace}
            selectedTraceKey={selectedTraceKey}
            comparisonTrace={comparisonTrace}
            comparisonTraceKey={comparisonTraceKey}
            preview={preview}
            setupDiffs={setupDiffs}
            setupDiffLoading={setupDiffLoading}
            compareUrl={compareUrl}
            onBack={backToBuckets}
            onAnalysisLapChange={(key) => {
              setSelectedTraceKey(key);
              setComparisonTraceKey(null);
            }}
            onComparisonLapChange={(key) => setComparisonTraceKey(key)}
            onDebrief={() => selectedTrace?.id && navigate(`/telemetry/debrief?trace=${selectedTrace.id}`)}
            onCompare={() => selectedTrace?.id && navigate(compareUrl)}
          />
        ) : (
          <CombinationOverview
            buckets={buckets}
            highlightedBucket={highlightedBucket}
            totalLogCount={filteredTraces.length}
            onHighlight={setHighlightedBucketKey}
            onOpen={openBucket}
          />
        )}
      </main>
    </div>
  );
};

const CombinationOverview: React.FC<{
  buckets: TraceBucket[];
  highlightedBucket: TraceBucket | null;
  totalLogCount: number;
  onHighlight: (key: string) => void;
  onOpen: (key: string) => void;
}> = ({ buckets, highlightedBucket, totalLogCount, onHighlight, onOpen }) => (
  <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] gap-3 min-h-[calc(100vh-13.5rem)] lg:min-h-0 lg:h-[calc(100vh-13.5rem)]">
    <section className="min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col">
      <div className="min-h-[58px] flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="min-w-0">
          <h3 className="text-base font-black text-gray-900 dark:text-gray-100">トラック × 車両</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
            分析に入る前に、同じ車両・同じトラックの組み合わせを選びます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tag>{totalLogCount} logs</Tag>
          <Tag color="blue">{buckets.length} pairs</Tag>
        </div>
      </div>
      <CombinationLedger
        buckets={buckets}
        highlightedKey={highlightedBucket?.key ?? null}
        onHighlight={onHighlight}
        onOpen={onOpen}
      />
    </section>

    <CombinationInspector bucket={highlightedBucket} onOpen={onOpen} />
  </section>
);

const CombinationLedger: React.FC<{
  buckets: TraceBucket[];
  highlightedKey: string | null;
  onHighlight: (key: string) => void;
  onOpen: (key: string) => void;
}> = ({ buckets, highlightedKey, onHighlight, onOpen }) => (
  <div className="min-h-0 overflow-auto">
    <table className="min-w-[920px] w-full border-collapse text-left">
      <thead className="sticky top-0 z-[1] bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
        <tr className="text-[11px] font-black tracking-[0.12em] uppercase text-gray-500 dark:text-gray-400">
          <th className="px-3 py-3 w-[30%]">Track</th>
          <th className="px-3 py-3 w-[22%]">Vehicle</th>
          <th className="px-3 py-3 w-[16%]">Best</th>
          <th className="px-3 py-3 w-[16%]">Last</th>
          <th className="px-3 py-3 w-[7%]">Logs</th>
          <th className="px-3 py-3 w-[9%]">Status</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket) => {
          const highlighted = bucket.key === highlightedKey;
          const status = bucketStatus(bucket);
          const displayTrace = bucket.bestTrace ?? bucket.lastTrace ?? bucket.traces[0];
          return (
            <tr
              key={bucket.key}
              className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                highlighted
                  ? 'bg-blue-50 dark:bg-blue-950/25 [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-blue-500'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/35'
              }`}
              onClick={() => onHighlight(bucket.key)}
              onDoubleClick={() => onOpen(bucket.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onOpen(bucket.key);
                }
                if (event.key === ' ') {
                  event.preventDefault();
                  onHighlight(bucket.key);
                }
              }}
              tabIndex={0}
              aria-selected={highlighted}
              title="クリックで選択、ダブルクリックまたはEnterで詳細を開く"
            >
              <td className="px-3 py-3 align-middle">
                <div className="flex items-center gap-3 min-w-0">
                  <TrackThumbnail trace={displayTrace} />
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 dark:text-gray-100 truncate">{compactTrackName(bucket.circuit)}</div>
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{bucket.trackId ?? 'estimated track'}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 align-middle">
                <div className="flex items-center gap-2 min-w-0">
                  <CarThumbnail />
                  <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{bucket.carModel}</span>
                </div>
              </td>
              <td className="px-3 py-3 align-middle">
                <LapTimeCell trace={bucket.bestTrace} />
              </td>
              <td className="px-3 py-3 align-middle">
                <LapTimeCell trace={bucket.lastTrace} />
              </td>
              <td className="px-3 py-3 align-middle">
                <div className="font-mono text-base font-black text-gray-900 dark:text-gray-50">{bucket.traces.length}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">logs</div>
              </td>
              <td className="px-3 py-3 align-middle">
                <div className="flex flex-col items-start gap-1">
                  <Tag color={status.color}>{status.label}</Tag>
                  <QualityPill tone={bucket.qualityTone} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const CombinationInspector: React.FC<{
  bucket: TraceBucket | null;
  onOpen: (key: string) => void;
}> = ({ bucket, onOpen }) => {
  if (!bucket) {
    return (
      <aside className="min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4 flex items-center justify-center">
        <Empty description="組み合わせを選択してください" />
      </aside>
    );
  }

  const trace = bucket.lastTrace ?? bucket.bestTrace ?? bucket.traces[0];
  const status = bucketStatus(bucket);
  return (
    <aside className="min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="text-[11px] font-black tracking-[0.16em] uppercase text-gray-400 dark:text-gray-500">Selected Pair</div>
        <h3 className="mt-1 text-xl font-black leading-tight text-gray-900 dark:text-gray-50">
          {compactTrackName(bucket.circuit)}
        </h3>
        <div className="mt-1 text-sm font-bold text-gray-600 dark:text-gray-300">{bucket.carModel}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Tag color={status.color}>{status.label}</Tag>
          <Tag>{bucket.traces.length} logs</Tag>
          <QualityTag flags={trace.qualityFlags} />
        </div>
      </div>

      <div className="p-4 space-y-4 min-h-0 flex-1 overflow-auto">
        <div className="h-48 border border-gray-200 dark:border-gray-700 rounded-md bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(75,85,99,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(75,85,99,.35)_1px,transparent_1px)] [background-size:26px_26px] grid place-items-center">
          <MapPreview trace={trace} reference={bucket.bestTrace} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InspectorMetric label="Best" trace={bucket.bestTrace} />
          <InspectorMetric label="Last" trace={bucket.lastTrace} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Recent Sessions</div>
          <div className="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
            {sortTracesByDateDesc(bucket.traces).slice(0, 5).map((item) => (
              <div key={traceKey(item)} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 dark:text-gray-100 truncate">{sessionLabel(item)} / LAP {item.lap.lapNumber}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(item.sessionDate)}</div>
                </div>
                <div className="font-mono font-black text-gray-900 dark:text-gray-50 whitespace-nowrap">
                  {formatLapSeconds(item.lap.timeSeconds)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <Button type="primary" block onClick={() => onOpen(bucket.key)}>
          詳細を開く
        </Button>
      </div>
    </aside>
  );
};

const AnalysisWorkspace: React.FC<{
  bucket: TraceBucket;
  selectedTrace: TelemetryTrace | null;
  selectedTraceKey: string | null;
  comparisonTrace: TelemetryTrace | null;
  comparisonTraceKey: string | null;
  preview: PreviewModel | null;
  setupDiffs: SetupDiffItem[];
  setupDiffLoading: boolean;
  compareUrl: string;
  onBack: () => void;
  onAnalysisLapChange: (key: string) => void;
  onComparisonLapChange: (key: string | null) => void;
  onDebrief: () => void;
  onCompare: () => void;
}> = ({
  bucket,
  selectedTrace,
  selectedTraceKey,
  comparisonTrace,
  comparisonTraceKey,
  preview,
  setupDiffs,
  setupDiffLoading,
  compareUrl,
  onBack,
  onAnalysisLapChange,
  onComparisonLapChange,
  onDebrief,
  onCompare,
}) => {
  const lapOptions = sortTracesByDateDesc(bucket.traces).map((trace) => ({
    value: traceKey(trace),
    label: lapSelectLabel(trace),
  }));
  const comparisonOptions = [
    { value: NO_COMPARISON, label: '比較なし' },
    ...sortComparisonTraces(selectedTrace, bucket.traces).map((trace) => ({
      value: traceKey(trace),
      label: comparisonSelectLabel(selectedTrace, trace),
    })),
  ];
  const selectedTone = selectedTrace ? qualityTone(selectedTrace.qualityFlags) : bucket.qualityTone;
  const titleTrace = selectedTrace ?? bucket.lastTrace ?? bucket.bestTrace ?? bucket.traces[0];

  return (
    <section className="min-h-[calc(100vh-13.5rem)] space-y-3">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <ArrowLeftOutlined />
              組み合わせ一覧
            </button>
            <div className="mt-2 text-[11px] font-black tracking-[0.16em] uppercase text-gray-400 dark:text-gray-500">
              Telemetry Analysis
            </div>
            <h3 className="mt-1 text-2xl sm:text-3xl font-black leading-tight text-gray-900 dark:text-gray-50">
              {compactTrackName(bucket.circuit)} × {bucket.carModel}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag color="blue">{bucket.traces.length} logs</Tag>
            <Tag>{bucket.bestTrace ? `Best ${formatLapSeconds(bucket.bestTrace.lap.timeSeconds)}` : 'Best -'}</Tag>
            <Tag>{titleTrace.source.format}</Tag>
            <QualityTag flags={titleTrace.qualityFlags} />
            {isSampleTelemetryTraceId(titleTrace.id) && <Tag color="blue">サンプル</Tag>}
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-900/25 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_auto] gap-2 xl:items-center">
            <label className="min-w-0">
              <div className="mb-1 text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">分析ラップ</div>
              <Select
                value={selectedTraceKey ?? undefined}
                onChange={onAnalysisLapChange}
                className="w-full"
                options={lapOptions}
              />
            </label>
            <label className="min-w-0">
              <div className="mb-1 text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">比較ラップ</div>
              <Select
                value={comparisonTraceKey ?? NO_COMPARISON}
                onChange={(value) => onComparisonLapChange(value === NO_COMPARISON ? null : value)}
                className="w-full"
                options={comparisonOptions}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2 xl:justify-end">
              <Button type="primary" onClick={onDebrief} disabled={!selectedTrace?.id}>
                デブリーフ
              </Button>
              <Button onClick={onCompare} disabled={!selectedTrace?.id}>
                比較
              </Button>
              {selectedTrace?.setupId && selectedTrace.setupId !== SAMPLE_TELEMETRY_SETUP_ID && (
                <Link
                  to={`/setup/${selectedTrace.setupId}`}
                  className="inline-flex items-center justify-center gap-1 px-3 h-8 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <FileTextOutlined />
                  記録
                </Link>
              )}
            </div>
          </div>
          {selectedTrace && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <Tag>{sessionLabel(selectedTrace)}</Tag>
              <Tag>{formatDateTime(selectedTrace.sessionDate)}</Tag>
              <Tag>{selectedTrace.lap.type}</Tag>
              <Tag>{selectedTrace.visibility}</Tag>
              <ConditionTags trace={selectedTrace} tone={selectedTone} />
              {comparisonTrace && (
                <Tag color={preview?.finalDelta != null && preview.finalDelta <= 0 ? 'green' : 'red'}>
                  比較差 {preview ? formatSignedSeconds(preview.finalDelta) : formatSignedSeconds(selectedTrace.lap.timeSeconds - comparisonTrace.lap.timeSeconds)}
                </Tag>
              )}
            </div>
          )}
        </div>
      </div>

      {!selectedTrace ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-12">
          <Empty description={<span className="text-gray-500 dark:text-gray-400">分析ラップを選択してください</span>} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 2xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.5fr)] gap-3">
            <FlatPanel title="走行ライン" subTitle={comparisonTrace ? 'analysis vs reference' : 'single lap'}>
              <div className="h-[360px] bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(75,85,99,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(75,85,99,.35)_1px,transparent_1px)] [background-size:30px_30px] grid place-items-center">
                <MapPreview trace={selectedTrace} reference={comparisonTrace} />
              </div>
            </FlatPanel>

            <FlatPanel title="Delta T" subTitle={comparisonTrace ? 'loss / gain across distance' : 'comparison required'}>
              <div className="h-[360px]">
                {preview ? (
                  <DeltaPreviewChart delta={preview.delta} annotations={preview.coaching.annotations} />
                ) : (
                  <MissingPreviewCard title="Delta T" description="比較ラップを選ぶと、どの距離で失っているかを表示します。" />
                )}
              </div>
            </FlatPanel>
          </section>

          <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.55fr)_380px] gap-3">
            <FlatPanel title="Telemetry Channels" subTitle="shared distance axis">
              <ChannelStack trace={selectedTrace} reference={comparisonTrace} />
            </FlatPanel>

            <AnalysisInsightPanel
              trace={selectedTrace}
              reference={comparisonTrace}
              preview={preview}
              setupDiffs={setupDiffs}
              setupDiffLoading={setupDiffLoading}
              compareUrl={compareUrl}
            />
          </section>
        </>
      )}
    </section>
  );
};

const FlatPanel: React.FC<React.PropsWithChildren<{ title: string; subTitle?: string }>> = ({ title, subTitle, children }) => (
  <section className="min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
    <div className="h-11 flex items-center justify-between gap-3 px-3 border-b border-gray-200 dark:border-gray-700">
      <div className="text-xs font-black tracking-wider uppercase text-gray-600 dark:text-gray-300">{title}</div>
      {subTitle && <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 truncate">{subTitle}</div>}
    </div>
    {children}
  </section>
);

const AnalysisInsightPanel: React.FC<{
  trace: TelemetryTrace;
  reference: TelemetryTrace | null;
  preview: PreviewModel | null;
  setupDiffs: SetupDiffItem[];
  setupDiffLoading: boolean;
  compareUrl: string;
}> = ({ trace, reference, preview, setupDiffs, setupDiffLoading, compareUrl }) => {
  const lossText = preview?.coaching.annotations.find((a) => a.kind === 'loss')?.text ?? '比較ラップを選択';
  const gainText = preview?.coaching.annotations.find((a) => a.kind === 'gain')?.text ?? '比較ラップを選択';
  const nextAction = preview ? buildNextAction(preview.coaching) : 'まず比較対象を選ぶ';
  const summaryText = preview?.coaching.summary ?? '比較ラップを選ぶと、速度差・Delta T・ライン差から走りの差分を要約します。';
  return (
    <aside className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <div className="h-11 flex items-center justify-between gap-3 px-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs font-black tracking-wider uppercase text-gray-600 dark:text-gray-300">Debrief</div>
        {reference?.id ? (
          <Link to={compareUrl} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            詳細比較
          </Link>
        ) : (
          <span className="text-[11px] text-gray-400 dark:text-gray-500">single lap</span>
        )}
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <InsightMetric
          label={preview ? `${preview.reference.label}比` : '比較状態'}
          value={preview ? formatSignedSeconds(preview.finalDelta) : '未選択'}
          tone={preview ? (preview.finalDelta <= 0 ? 'good' : 'bad') : 'neutral'}
        />
        <InsightMetric label="最大ロス" value={lossText} tone="bad" />
        <InsightMetric label="最大ゲイン" value={gainText} tone="good" />
        <InsightMetric label="次走アクション" value={nextAction} tone="neutral" />
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Summary</div>
        <p className="mt-2 text-sm leading-6 text-gray-800 dark:text-gray-100">{summaryText}</p>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Setup Diff</div>
        <div className="mt-2 space-y-1.5">
          {setupDiffLoading ? (
            <Tag>読み込み中...</Tag>
          ) : setupDiffs.length > 0 ? (
            setupDiffs.slice(0, 6).map((item) => (
              <div key={`${item.section}-${item.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                <span className="truncate text-gray-600 dark:text-gray-300">{item.label}</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {item.aDisplay} → {item.bDisplay}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">比較できるセット差分なし</div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">Selected Lap</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag>{sessionLabel(trace)}</Tag>
          <Tag>LAP {trace.lap.lapNumber}</Tag>
          <Tag>{formatLapSeconds(trace.lap.timeSeconds)}</Tag>
          <Tag>{trace.source.format}</Tag>
        </div>
      </div>
    </aside>
  );
};

const InsightMetric: React.FC<{
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral';
}> = ({ label, value, tone }) => {
  const color = tone === 'good'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'bad'
      ? 'text-red-600 dark:text-red-400'
      : 'text-blue-600 dark:text-blue-400';
  return (
    <div className="px-3 py-2.5">
      <div className="text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-base font-black leading-tight ${color}`}>{value}</div>
    </div>
  );
};

const LapTimeCell: React.FC<{ trace: TelemetryTrace | null }> = ({ trace }) => (
  <div className="min-w-0">
    {trace ? (
      <>
        <div className="font-mono tabular-nums text-lg font-black leading-tight text-gray-900 dark:text-gray-50">
          {formatLapSeconds(trace.lap.timeSeconds)}
        </div>
        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDateTime(trace.sessionDate)}
        </div>
      </>
    ) : (
      <>
        <div className="font-mono text-lg font-black text-gray-400">--:--.---</div>
        <div className="text-xs text-gray-400">no normal lap</div>
      </>
    )}
  </div>
);

const InspectorMetric: React.FC<{ label: string; trace: TelemetryTrace | null }> = ({ label, trace }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
    <div className="text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">{label}</div>
    {trace ? (
      <>
        <div className="mt-1 font-mono text-xl font-black text-gray-900 dark:text-gray-50">{formatLapSeconds(trace.lap.timeSeconds)}</div>
        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(trace.sessionDate)}</div>
      </>
    ) : (
      <div className="mt-2 text-sm text-gray-400">データなし</div>
    )}
  </div>
);

const TrackThumbnail: React.FC<{ trace: TelemetryTrace }> = ({ trace }) => {
  const points = trackThumbnailPoints(trace);
  return (
    <div className="h-14 w-20 shrink-0 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 grid place-items-center overflow-hidden">
      {points.length >= 2 ? (
        <svg viewBox="0 0 80 54" className="w-[72px] h-[48px]">
          <polyline
            points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-900 dark:text-gray-100"
          />
        </svg>
      ) : (
        <EnvironmentOutlined className="text-xl text-gray-400" />
      )}
    </div>
  );
};

const CarThumbnail: React.FC = () => (
  <div className="h-9 w-16 shrink-0 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 grid place-items-center overflow-hidden">
    <img src={telemetryMockCarUrl} alt="" className="w-full h-full object-contain px-1.5 py-1" loading="lazy" />
  </div>
);

const MapPreview: React.FC<{ trace: TelemetryTrace; reference: TelemetryTrace | null }> = ({ trace, reference }) => {
  const [current, ref] = normalizeSharedPathPoints(
    [
      [trace.path?.xM, trace.path?.yM],
      [reference?.path?.xM, reference?.path?.yM],
    ],
    300,
    260,
    20,
  );
  const fallback = trackThumbnailPoints(trace, 300, 260, 20);
  return (
    <svg viewBox="0 0 300 260" className="w-full h-full max-w-[430px] p-4">
      {fallback.length >= 2 && current.length < 2 && (
        <polyline points={pointsAttr(fallback)} fill="none" stroke="#111827" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      )}
      {ref.length >= 2 && (
        <polyline points={pointsAttr(ref)} fill="none" stroke="#2474ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      )}
      {current.length >= 2 && (
        <polyline points={pointsAttr(current)} fill="none" stroke="#ef233c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
      )}
      {current.length >= 2 && (
        <circle cx={current[Math.floor(current.length * 0.52)]?.[0] ?? 150} cy={current[Math.floor(current.length * 0.52)]?.[1] ?? 130} r="6" fill="#fff" stroke="#2474ff" strokeWidth="3" />
      )}
      <g transform="translate(18 224)">
        {ref.length >= 2 && (
          <>
            <line x1="0" x2="18" y1="0" y2="0" stroke="#2474ff" strokeWidth="4" strokeLinecap="round" />
            <text x="24" y="4" fontSize="10" fontWeight="800" fill="#64748b">比較</text>
          </>
        )}
        <line x1="70" x2="88" y1="0" y2="0" stroke="#ef233c" strokeWidth="4" strokeLinecap="round" />
        <text x="94" y="4" fontSize="10" fontWeight="800" fill="#64748b">分析</text>
      </g>
    </svg>
  );
};

const DeltaPreviewChart: React.FC<{
  delta: DeltaTResult;
  annotations: CoachingReadout['annotations'];
}> = ({ delta, annotations }) => {
  const points = delta.points.map((point) => [point.distance, point.delta] as [number, number]);
  const normalized = normalizeChartPoints(points, 820, 250, 24, true);
  const pieces = normalized.slice(0, -1).map((point, index) => {
    const next = normalized[index + 1];
    const slope = delta.points[index + 1]?.delta - delta.points[index]?.delta;
    return { point, next, color: slope > 0 ? '#ef233c' : slope < 0 ? '#08a66f' : '#64748b' };
  });
  const zeroY = normalizeChartY(0, points.map(([, y]) => y), 250, 24, true);
  const firstLoss = annotations.find((annotation) => annotation.kind === 'loss');
  const firstGain = annotations.find((annotation) => annotation.kind === 'gain');
  return (
    <ChartShell title="Delta T / s" sub="positive = analysis lap is slower">
      <svg viewBox="0 0 820 250" className="w-full h-full" preserveAspectRatio="none">
        <GridLines width={820} height={250} />
        <line x1="0" x2="820" y1={zeroY} y2={zeroY} stroke="#cbd5e1" strokeWidth="1.2" />
        {pieces.map(({ point, next, color }, index) => (
          <line
            key={index}
            x1={point[0]}
            y1={point[1]}
            x2={next[0]}
            y2={next[1]}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        {firstLoss && <AnnotationPin x={440} y={46} text={firstLoss.text} tone="loss" />}
        {firstGain && <AnnotationPin x={620} y={118} text={firstGain.text} tone="gain" />}
      </svg>
    </ChartShell>
  );
};

const ChannelStack: React.FC<{ trace: TelemetryTrace; reference: TelemetryTrace | null }> = ({ trace, reference }) => {
  const specs: { key: ChannelKey; label: string; unit: string; includeZero: boolean }[] = [
    { key: 'speedKmh', label: 'Speed', unit: 'km/h', includeZero: false },
    { key: 'throttlePct', label: 'Throttle', unit: '%', includeZero: true },
    { key: 'brakePct', label: 'Brake', unit: '%', includeZero: true },
    { key: 'steeringDeg', label: 'Steering', unit: 'deg', includeZero: true },
    { key: 'gear', label: 'Gear', unit: '', includeZero: true },
  ];
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {specs.map((spec) => (
        <SimpleChannelChart
          key={spec.key}
          label={spec.label}
          unit={spec.unit}
          includeZero={spec.includeZero}
          current={channelSeries(trace, spec.key)}
          reference={reference ? channelSeries(reference, spec.key) : []}
        />
      ))}
    </div>
  );
};

const SimpleChannelChart: React.FC<{
  label: string;
  unit: string;
  includeZero: boolean;
  current: [number, number][];
  reference: [number, number][];
}> = ({ label, unit, includeZero, current, reference }) => {
  const allX = [...current, ...reference].map(([x]) => x);
  const allY = [...current, ...reference].map(([, y]) => y);
  const currentPoints = normalizeChartPoints(current, 720, 86, 10, includeZero, allY, allX);
  const referencePoints = normalizeChartPoints(reference, 720, 86, 10, includeZero, allY, allX);
  const latest = current[current.length - 1]?.[1];
  return (
    <div className="grid grid-cols-[94px_minmax(0,1fr)_88px] items-center min-h-[82px]">
      <div className="px-3">
        <div className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">{label}</div>
        <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{unit || 'channel'}</div>
      </div>
      <div className="h-[70px] min-w-0">
        {current.length === 0 && reference.length === 0 ? (
          <div className="h-full flex items-center text-xs text-gray-400 dark:text-gray-500">channel unavailable</div>
        ) : (
          <svg viewBox="0 0 720 86" className="w-full h-full" preserveAspectRatio="none">
            <GridLines width={720} height={86} />
            {referencePoints.length >= 2 && (
              <polyline points={pointsAttr(referencePoints)} fill="none" stroke="#2474ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            )}
            {currentPoints.length >= 2 && (
              <polyline points={pointsAttr(currentPoints)} fill="none" stroke="#ef233c" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        )}
      </div>
      <div className="px-3 text-right">
        <div className="font-mono text-sm font-black text-gray-900 dark:text-gray-50">
          {latest == null ? '-' : formatChannelValue(latest, unit)}
        </div>
      </div>
    </div>
  );
};

const MissingPreviewCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="h-full min-h-[260px] p-4 flex items-center">
    <div>
      <div className="text-xs font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">{title}</div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

const ChartShell: React.FC<React.PropsWithChildren<{ title: string; sub: string }>> = ({ title, sub, children }) => (
  <div className="relative h-full min-h-[260px] bg-white dark:bg-gray-800 overflow-hidden">
    <div className="absolute top-2.5 left-3 z-[1] text-[11px] font-black tracking-wider uppercase text-gray-500 dark:text-gray-400">
      {title}
      <span className="ml-2 text-gray-400 dark:text-gray-500">{sub}</span>
    </div>
    {children}
  </div>
);

const GridLines: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <>
    {[0.25, 0.5, 0.75].map((ratio) => (
      <line key={`h-${ratio}`} x1="0" x2={width} y1={height * ratio} y2={height * ratio} stroke="#e5e7eb" strokeWidth="1" />
    ))}
    {[0.25, 0.5, 0.75].map((ratio) => (
      <line key={`v-${ratio}`} x1={width * ratio} x2={width * ratio} y1="0" y2={height} stroke="#f1f5f9" strokeWidth="1" />
    ))}
  </>
);

const AnnotationPin: React.FC<{ x: number; y: number; text: string; tone: 'loss' | 'gain' }> = ({ x, y, text, tone }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width="126" height="24" rx="4" fill={tone === 'loss' ? '#b91c1c' : '#047857'} opacity="0.95" />
    <text x="8" y="16" fill="#ffffff" fontSize="10" fontWeight="800">
      {shorten(text, 14)}
    </text>
  </g>
);

const ConditionTags: React.FC<{
  trace: TelemetryTrace;
  tone: TraceQualityTone;
}> = ({ trace, tone }) => (
  <>
    {trace.conditions.weather.trackTemp != null && <Tag color="orange">路温{trace.conditions.weather.trackTemp}°C</Tag>}
    {trace.conditions.weather.airTemp != null && <Tag>気温{trace.conditions.weather.airTemp}°C</Tag>}
    {trace.conditions.weather.condition && <Tag color={trace.conditions.weather.condition.includes('ウェット') ? 'blue' : 'green'}>{trace.conditions.weather.condition}</Tag>}
    {trace.conditions.fuel != null && <Tag>Fuel {trace.conditions.fuel}L</Tag>}
    {trace.conditions.tireInfo.brand && <Tag>{trace.conditions.tireInfo.brand} {trace.conditions.tireInfo.compound}</Tag>}
    {tone !== 'verified' && <Tag color={tone === 'limited' ? 'red' : 'gold'}>{tone}</Tag>}
  </>
);

const QualityPill: React.FC<{ tone: TraceQualityTone }> = ({ tone }) => {
  const style = tone === 'verified'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    : tone === 'usable'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
  return (
    <span className={`inline-flex h-6 items-center rounded px-2 text-[11px] font-black ${style}`}>
      {tone === 'verified' ? 'Verified' : tone === 'usable' ? 'Usable' : 'Limited'}
    </span>
  );
};

const QualityTag: React.FC<{ flags: TelemetryTraceQualityFlags }> = ({ flags }) => {
  const tone = qualityTone(flags);
  if (tone === 'limited') return <Tag color="red" icon={<WarningOutlined />}>Limited</Tag>;
  if (tone === 'usable') return <Tag color="gold" icon={<WarningOutlined />}>Usable</Tag>;
  return <Tag color="green" icon={<CheckCircleOutlined />}>Verified</Tag>;
};

function traceKey(trace: TelemetryTrace): string {
  return trace.id ?? `${trace.ownerId}-${trace.setupId}-${trace.lap.lapNumber}-${trace.sessionDate.getTime()}`;
}

function bucketKey(trace: TelemetryTrace): string {
  return `${trace.carModel}__${trace.trackId ?? trace.circuit}`;
}

function buildTraceBuckets(items: TelemetryTrace[]): TraceBucket[] {
  const grouped = new Map<string, TelemetryTrace[]>();
  items.forEach((trace) => {
    const key = bucketKey(trace);
    grouped.set(key, [...(grouped.get(key) ?? []), trace]);
  });

  return Array.from(grouped.entries())
    .map(([key, group]) => {
      const sorted = sortTracesByDateDesc(group);
      const validNormal = sorted.filter((trace) => trace.lap.valid && trace.lap.type === 'NORMAL');
      const bestTrace = validNormal.length > 0
        ? validNormal.reduce((best, next) => (next.lap.timeSeconds < best.lap.timeSeconds ? next : best))
        : null;
      const lastTrace = validNormal[0] ?? sorted[0] ?? null;
      return {
        key,
        circuit: sorted[0]?.circuit ?? '',
        carModel: sorted[0]?.carModel ?? '',
        trackId: sorted[0]?.trackId ?? null,
        traces: sorted,
        bestTrace,
        lastTrace,
        validNormalCount: validNormal.length,
        qualityTone: worstQualityTone(sorted),
      };
    })
    .sort((a, b) => {
      const aTime = a.lastTrace?.sessionDate.getTime() ?? 0;
      const bTime = b.lastTrace?.sessionDate.getTime() ?? 0;
      return bTime - aTime;
    });
}

function sortTracesByDateDesc(items: TelemetryTrace[]): TelemetryTrace[] {
  return [...items].sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
}

function sortComparisonTraces(current: TelemetryTrace | null, items: TelemetryTrace[]): TelemetryTrace[] {
  return [...items]
    .filter((trace) => (!current || traceKey(trace) !== traceKey(current)) && trace.lap.valid && trace.lap.type === 'NORMAL')
    .sort((a, b) => {
      if (a.lap.timeSeconds !== b.lap.timeSeconds) return a.lap.timeSeconds - b.lap.timeSeconds;
      return b.sessionDate.getTime() - a.sessionDate.getTime();
    });
}

function countOptions(values: string[]): { value: string; label: string }[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: `${value} (${count})` }));
}

function qualityTone(flags: TelemetryTraceQualityFlags): TraceQualityTone {
  if (flags.gpsDropout || flags.lowSampleRate) return 'limited';
  if (flags.estimatedLine || flags.singleLapFile || flags.missingOperationChannels) return 'usable';
  return 'verified';
}

function worstQualityTone(items: TelemetryTrace[]): TraceQualityTone {
  const tones = items.map((trace) => qualityTone(trace.qualityFlags));
  if (tones.includes('limited')) return 'limited';
  if (tones.includes('usable')) return 'usable';
  return 'verified';
}

function bucketStatus(bucket: TraceBucket): { label: string; color: string } {
  if (bucket.validNormalCount >= 2) return { label: '比較可', color: 'green' };
  if (bucket.validNormalCount === 1) return { label: '比較候補待ち', color: 'gold' };
  return { label: '要確認', color: 'red' };
}

function isSetupLoadable(setupId: string | null | undefined): setupId is string {
  return Boolean(setupId && setupId !== SAMPLE_TELEMETRY_SETUP_ID);
}

function sameComparableBucket(a: TelemetryTrace, b: TelemetryTrace): boolean {
  if (a.carModel !== b.carModel) return false;
  if (a.trackId && b.trackId) return a.trackId === b.trackId;
  return a.circuit === b.circuit;
}

function conditionScore(current: TelemetryTrace, candidate: TelemetryTrace): number {
  let score = 0;
  const airA = current.conditions.weather.airTemp;
  const airB = candidate.conditions.weather.airTemp;
  score += airA != null && airB != null ? Math.abs(airA - airB) : 8;

  const trackA = current.conditions.weather.trackTemp;
  const trackB = candidate.conditions.weather.trackTemp;
  score += trackA != null && trackB != null ? Math.abs(trackA - trackB) * 0.7 : 8;

  const fuelA = current.conditions.fuel;
  const fuelB = candidate.conditions.fuel;
  score += fuelA != null && fuelB != null ? Math.abs(fuelA - fuelB) * 0.15 : 3;

  if (current.conditions.tireInfo.brand !== candidate.conditions.tireInfo.brand) score += 8;
  if (current.conditions.tireInfo.compound !== candidate.conditions.tireInfo.compound) score += 6;
  return score;
}

function buildPreviewCandidates(current: TelemetryTrace, traces: TelemetryTrace[]): PreviewCandidate[] {
  if (!current.lap.valid || current.lap.type !== 'NORMAL') return [];
  const valid = traces.filter((trace) => (
    trace.id &&
    trace.id !== current.id &&
    trace.lap.valid &&
    trace.lap.type === 'NORMAL' &&
    sameComparableBucket(current, trace)
  ));
  if (valid.length === 0) return [];

  const byId = new Map<string, PreviewCandidate>();
  const add = (trace: TelemetryTrace, kind: PreviewCandidateKind, score: number) => {
    if (!trace.id || byId.has(trace.id)) return;
    const deltaSeconds = current.lap.timeSeconds - trace.lap.timeSeconds;
    const label = kind === 'self_best'
      ? '自己ベスト'
      : kind === 'previous'
        ? '前回セッション'
        : '条件が近いログ';
    const description = kind === 'condition_match'
      ? `${trace.sessionDate.toLocaleDateString('ja-JP')} / 条件差 ${score.toFixed(1)}`
      : `${trace.sessionDate.toLocaleDateString('ja-JP')} / ${formatSignedSeconds(deltaSeconds)}`;
    byId.set(trace.id, { trace, kind, label, description, score, deltaSeconds });
  };

  const selfBest = valid.reduce((best, next) => (
    next.lap.timeSeconds < best.lap.timeSeconds ? next : best
  ));
  add(selfBest, 'self_best', 0);

  const previous = valid
    .filter((trace) => trace.sessionDate.getTime() < current.sessionDate.getTime())
    .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())[0];
  if (previous) add(previous, 'previous', 1);

  const conditionMatch = [...valid].sort((a, b) => conditionScore(current, a) - conditionScore(current, b))[0];
  if (conditionMatch) add(conditionMatch, 'condition_match', conditionScore(current, conditionMatch));

  return Array.from(byId.values());
}

function buildDefaultComparisonTrace(current: TelemetryTrace, traces: TelemetryTrace[]): TelemetryTrace | null {
  return buildPreviewCandidates(current, traces)[0]?.trace
    ?? sortComparisonTraces(current, traces)[0]
    ?? null;
}

function buildReferenceCandidate(current: TelemetryTrace, reference: TelemetryTrace, traces: TelemetryTrace[]): PreviewCandidate {
  const existing = buildPreviewCandidates(current, traces).find((candidate) => traceKey(candidate.trace) === traceKey(reference));
  if (existing) return existing;
  const deltaSeconds = current.lap.timeSeconds - reference.lap.timeSeconds;
  return {
    trace: reference,
    kind: 'condition_match',
    label: '比較ラップ',
    description: `${formatDateTime(reference.sessionDate)} / ${formatSignedSeconds(deltaSeconds)}`,
    score: conditionScore(current, reference),
    deltaSeconds,
  };
}

function buildNextAction(readout: CoachingReadout): string {
  const braking = readout.annotations.find((annotation) => annotation.text.includes('ブレーキ開始') && annotation.text.includes('手前'));
  if (braking) return 'ブレーキ開始を少し奥へ';
  const cornerSpeed = readout.annotations.find((annotation) => annotation.text.includes('最小コーナー速度') && annotation.text.includes('低い'));
  if (cornerSpeed) return 'ボトム速度を落としすぎない';
  if (readout.topOpportunity) return `${readout.topOpportunity}を確認`;
  return '良い区間を再現';
}

function buildSetupDiffs(reference: CarSetup, current: CarSetup): SetupDiffItem[] {
  const skipSections = new Set(['セッション情報', 'ラップタイム']);
  const diffs: SetupDiffItem[] = [];
  for (const section of buildCompareSections()) {
    if (skipSections.has(section.title)) continue;
    for (const row of section.rows) {
      const result = compareRow(row, reference, current);
      if (result.kind === 'same' || result.kind === 'both-null') continue;
      diffs.push({
        section: section.title,
        label: row.label,
        aDisplay: result.aDisplay,
        bDisplay: result.bDisplay,
        delta: result.delta,
      });
    }
  }
  return diffs;
}

function trackThumbnailPoints(trace: TelemetryTrace, width = 80, height = 54, pad = 8): [number, number][] {
  const fromTrace = normalizePathPoints(trace.path?.xM, trace.path?.yM, width, height, pad);
  if (fromTrace.length >= 2) return fromTrace;
  const map = trace.trackId ? findTrackById(trace.trackId)?.map : null;
  if (!map || map.centerline.length < 2) return [];
  const origin = map.centerline[0];
  const xs = map.centerline.map((point) => (point.lon - origin.lon) * 91400);
  const ys = map.centerline.map((point) => (point.lat - origin.lat) * 111000);
  return normalizePathPoints(xs, ys, width, height, pad);
}

function normalizePathPoints(
  xs: readonly number[] | undefined,
  ys: readonly number[] | undefined,
  width: number,
  height: number,
  pad: number,
): [number, number][] {
  if (!xs || !ys || xs.length < 2 || xs.length !== ys.length) return [];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = (width - drawnW) / 2;
  const offsetY = (height - drawnH) / 2;
  return xs.map((x, i) => [
    offsetX + (x - minX) * scale,
    height - (offsetY + (ys[i] - minY) * scale),
  ]);
}

function normalizeSharedPathPoints(
  paths: readonly [readonly number[] | undefined, readonly number[] | undefined][],
  width: number,
  height: number,
  pad: number,
): [number, number][][] {
  const validPaths = paths
    .map(([xs, ys]) => ({ xs, ys }))
    .filter((path): path is { xs: readonly number[]; ys: readonly number[] } => (
      Boolean(path.xs && path.ys && path.xs.length >= 2 && path.xs.length === path.ys.length)
    ));
  if (validPaths.length === 0) return paths.map(() => []);

  const allX = validPaths.flatMap((path) => [...path.xs]);
  const allY = validPaths.flatMap((path) => [...path.ys]);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = (width - drawnW) / 2;
  const offsetY = (height - drawnH) / 2;

  return paths.map(([xs, ys]) => {
    if (!xs || !ys || xs.length < 2 || xs.length !== ys.length) return [];
    return xs.map((x, i) => [
      offsetX + (x - minX) * scale,
      height - (offsetY + (ys[i] - minY) * scale),
    ]);
  });
}

function normalizeChartPoints(
  series: readonly [number, number][],
  width: number,
  height: number,
  pad: number,
  includeZero: boolean,
  sharedY?: readonly number[],
  sharedX?: readonly number[],
): [number, number][] {
  if (series.length === 0) return [];
  const xs = sharedX && sharedX.length > 0 ? sharedX : series.map(([x]) => x);
  const ys = sharedY && sharedY.length > 0 ? sharedY : series.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = includeZero ? Math.min(0, ...ys) : Math.min(...ys);
  const maxY = includeZero ? Math.max(0, ...ys) : Math.max(...ys);
  const xSpan = Math.max(1, maxX - minX);
  const ySpan = Math.max(1, maxY - minY);
  return series.map(([x, y]) => [
    ((x - minX) / xSpan) * width,
    height - pad - ((y - minY) / ySpan) * (height - pad * 2),
  ]);
}

function normalizeChartY(
  y: number,
  values: readonly number[],
  height: number,
  pad: number,
  includeZero: boolean,
): number {
  const safeValues = values.length > 0 ? values : [0];
  const minY = includeZero ? Math.min(0, ...safeValues) : Math.min(...safeValues);
  const maxY = includeZero ? Math.max(0, ...safeValues) : Math.max(...safeValues);
  const ySpan = Math.max(1, maxY - minY);
  return height - pad - ((y - minY) / ySpan) * (height - pad * 2);
}

function channelSeries(trace: TelemetryTrace, key: ChannelKey): [number, number][] {
  const values = trace.channels[key];
  const distances = trace.channels.distanceM;
  if (!values || !distances || values.length === 0 || distances.length === 0) return [];
  const length = Math.min(values.length, distances.length);
  const series: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    const x = distances[i];
    const y = values[i];
    if (Number.isFinite(x) && Number.isFinite(y)) series.push([x, y]);
  }
  return downsampleSeries(series, 520);
}

function downsampleSeries(series: [number, number][], maxPoints: number): [number, number][] {
  if (series.length <= maxPoints) return series;
  const step = Math.ceil(series.length / maxPoints);
  return series.filter((_, index) => index % step === 0);
}

function pointsAttr(points: readonly [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatSignedSeconds(seconds: number): string {
  return `${seconds >= 0 ? '+' : '-'}${Math.abs(seconds).toFixed(3)}s`;
}

function formatChannelValue(value: number, unit: string): string {
  if (unit === '') return value.toFixed(0);
  if (unit === '%') return `${value.toFixed(0)}%`;
  if (unit === 'deg') return `${value.toFixed(0)}°`;
  return value.toFixed(1);
}

function lapSelectLabel(trace: TelemetryTrace): string {
  return `${sessionLabel(trace)} / ${formatDateTime(trace.sessionDate)} / LAP ${trace.lap.lapNumber} / ${formatLapSeconds(trace.lap.timeSeconds)}`;
}

function comparisonSelectLabel(current: TelemetryTrace | null, trace: TelemetryTrace): string {
  const delta = current ? ` / ${formatSignedSeconds(current.lap.timeSeconds - trace.lap.timeSeconds)}` : '';
  return `${sessionLabel(trace)} / LAP ${trace.lap.lapNumber} / ${formatLapSeconds(trace.lap.timeSeconds)}${delta}`;
}

function sessionLabel(trace: TelemetryTrace): string {
  const year = trace.sessionDate.getFullYear();
  switch (trace.sessionType) {
    case 'qualifying':
      return `${year} Qualifying`;
    case 'race':
      return `${year} Race`;
    default:
      return `${year} Practice`;
  }
}

function compactTrackName(name: string): string {
  return name
    .replace('筑波サーキット コース2000', 'Tsukuba TC2000')
    .replace('鈴鹿サーキット（国際レーシングコース）', 'Suzuka Circuit')
    .replace('富士スピードウェイ（本コース）', 'Fuji Speedway')
    .replace('モビリティリゾートもてぎ（ロードコース)', 'Motegi Road');
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
