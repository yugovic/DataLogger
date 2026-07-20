import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Empty, Input, Spin, Tag, message } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  RiseOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Header } from '../common/Header';
import type { CarSetup } from '../../types/setup';
import type { TelemetryTrace, TelemetryTraceQualityFlags } from '../../types/telemetryTrace';
import {
  getComparableTraceCandidates,
  getTelemetryTrace,
  updateTelemetryTrace,
  type ComparableTraceCandidate,
} from '../../services/telemetryTraceService';
import { getSetup } from '../../services/setupService';
import {
  buildCoachingReadout,
  computeLapMetrics,
  computeSegmentDeltas,
  deltaT,
  traceToLapProfile,
  type CoachingReadout,
} from '../../lib/telemetry';
import { buildCompareSections, compareRow, formatDelta, resolveCompareSections } from '../../lib/setupFields';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatLapSeconds } from './evidence';
import { SingleLapTelemetryView } from './SingleLapTelemetryView';
import logger from '../../utils/logger';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../lib/analytics';

interface SetupDiffItem {
  section: string;
  label: string;
  aDisplay: string;
  bDisplay: string;
  delta: number | null;
}

export const TelemetryDebrief: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const traceId = params.get('trace');

  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [trace, setTrace] = useState<TelemetryTrace | null>(null);
  const [reference, setReference] = useState<ComparableTraceCandidate | null>(null);
  const [setup, setSetup] = useState<CarSetup | null>(null);
  const [referenceSetup, setReferenceSetup] = useState<CarSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nextActionDraft, setNextActionDraft] = useState('');
  const [savingNextAction, setSavingNextAction] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!traceId) {
        setLoadError('デブリーフ対象のトレースが指定されていません');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const currentTrace = await getTelemetryTrace(traceId);
        if (!currentTrace) {
          setLoadError('デブリーフ対象のトレースが見つかりません');
          return;
        }
        const candidates = await getComparableTraceCandidates(currentTrace);
        const defaultReference = candidates[0] ?? null;
        const [currentSetup, refSetup] = await Promise.all([
          getSetup(currentTrace.setupId),
          defaultReference ? getSetup(defaultReference.trace.setupId) : Promise.resolve(null),
        ]);
        setTrace(currentTrace);
        setReference(defaultReference);
        setSetup(currentSetup);
        setReferenceSetup(refSetup);
        setNextActionDraft(currentTrace.summary.nextAction ?? '');
        void trackEvent('debrief_viewed', {
          circuit: currentTrace.circuit,
          car_model: currentTrace.carModel,
        });
      } catch (error) {
        logger.error('テレメトリデブリーフの読み込みに失敗しました:', error);
        setLoadError('テレメトリデブリーフの読み込みに失敗しました');
        message.error('テレメトリデブリーフの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [traceId]);

  const debrief = useMemo(() => {
    if (!trace || !reference) return null;
    const referenceProfile = traceToLapProfile(reference.trace);
    const currentProfile = traceToLapProfile(trace);
    const d = deltaT(referenceProfile, currentProfile, 10);
    const metricsReference = computeLapMetrics(referenceProfile, reference.trace.lap.timeSeconds);
    const metricsCurrent = computeLapMetrics(currentProfile, trace.lap.timeSeconds);
    const segments = computeSegmentDeltas(d, 3);
    const coaching = buildCoachingReadout(d, metricsReference, metricsCurrent, segments);
    return {
      delta: d,
      metricsReference,
      metricsCurrent,
      segments,
      coaching,
      cautions: buildCautions(trace, reference.trace),
      nextAction: buildNextAction(coaching),
    };
  }, [trace, reference]);

  const setupDiffs = useMemo(
    () => (setup && referenceSetup ? buildSetupDiffs(referenceSetup, setup, t) : []),
    [setup, referenceSetup, t],
  );

  const lossText = debrief?.coaching.annotations.find((a) => a.kind === 'loss')?.text ?? '明確な最大ロスは検出されていません';
  const gainText = debrief?.coaching.annotations.find((a) => a.kind === 'gain')?.text ?? '明確な最大ゲインは検出されていません';

  useEffect(() => {
    if (!debrief || nextActionDraft.trim()) return;
    setNextActionDraft(debrief.nextAction);
  }, [debrief, nextActionDraft]);

  const saveNextAction = async () => {
    const text = nextActionDraft.trim();
    if (!trace?.id || !text || currentUser?.uid !== trace.ownerId) return;
    setSavingNextAction(true);
    try {
      await updateTelemetryTrace(trace.id, {
        summary: { ...trace.summary, nextAction: text },
      });
      setTrace({ ...trace, summary: { ...trace.summary, nextAction: text } });
      void trackEvent('next_action_saved', { circuit: trace.circuit, car_model: trace.carModel });
      message.success('次回試すことを保存しました');
    } catch (error) {
      logger.error('次走アクションの保存に失敗しました:', error);
      message.error('次回試すことを保存できませんでした');
    } finally {
      setSavingNextAction(false);
    }
  };

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

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          </div>
        ) : loadError || !trace ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty description={<span className="text-gray-500 dark:text-gray-400">{loadError ?? 'デブリーフできません'}</span>} />
          </div>
        ) : (
          <div className="space-y-4">
            <DebriefHeader trace={trace} setup={setup} reference={reference} />

            {!reference || !debrief ? (
              <FirstTraceCard trace={trace} />
            ) : (
              <>
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <DebriefMetric
                    label={`${reference.label}比`}
                    value={formatSignedSeconds(debrief.delta.finalDelta)}
                    tone={debrief.delta.finalDelta <= 0 ? 'good' : 'bad'}
                    detail={debrief.delta.finalDelta <= 0 ? '今回が速い' : '今回が遅い'}
                  />
                  <DebriefMetric label="最大ロス" value={lossText} tone="bad" detail="まずここだけを見る" />
                  <DebriefMetric label="最大ゲイン" value={gainText} tone="good" detail="再現したい区間" />
                  <DebriefMetric label="次走アクション" value={debrief.nextAction} tone="neutral" detail="1つだけ試す" />
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">今日の結論</h3>
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                        {debrief.coaching.summary}
                      </p>
                    </div>
                    <div className="md:w-80">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">注意ラベル</h3>
                      <CautionTags cautions={debrief.cautions} qualityFlags={trace.qualityFlags} />
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="next-action" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        次回ひとつだけ試すこと
                      </label>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        提案をそのまま使うか、自分の言葉に直して次の走行へ残します。
                      </p>
                      <Input.TextArea
                        id="next-action"
                        value={nextActionDraft}
                        onChange={(event) => setNextActionDraft(event.target.value)}
                        maxLength={300}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        className="mt-3"
                        disabled={currentUser?.uid !== trace.ownerId}
                      />
                    </div>
                    {currentUser?.uid === trace.ownerId && (
                      <Button
                        type="primary"
                        onClick={saveNextAction}
                        loading={savingNextAction}
                        disabled={!nextActionDraft.trim() || nextActionDraft.trim() === trace.summary.nextAction}
                        className="w-full sm:w-auto"
                      >
                        次走へ保存
                      </Button>
                    )}
                  </div>
                </section>

                {setupDiffs.length > 0 && (
                  <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">セット差分</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          A={reference.label} / B=今回。テレメトリ差分の原因候補として見る項目です。
                        </p>
                      </div>
                      <Tag color="purple">{setupDiffs.length}項目</Tag>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {setupDiffs.slice(0, 10).map((item) => (
                        <div key={`${item.section}-${item.label}`} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                          <div className="text-[11px] text-gray-400 dark:text-gray-500">{item.section}</div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                              {item.aDisplay} → {item.bDisplay}
                              {item.delta !== null && (
                                <span className={item.delta === 0 ? '' : item.delta > 0 ? ' text-red-500' : ' text-emerald-500'}>
                                  {' '}({formatDelta(item.delta)})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/telemetry/compare?aTrace=${reference.trace.id}&bTrace=${trace.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  >
                    詳細比較を開く
                  </Link>
                  <Link
                    to={`/setup/${trace.setupId}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  >
                    記録を開く
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const DebriefHeader: React.FC<{
  trace: TelemetryTrace;
  setup: CarSetup | null;
  reference: ComparableTraceCandidate | null;
}> = ({ trace, setup, reference }) => (
  <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">セッション・デブリーフ</h2>
          <QualityTag flags={trace.qualityFlags} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {trace.sessionDate.toLocaleDateString('ja-JP')} / {trace.carModel} / {trace.circuit}
        </p>
      </div>
      <div className="lg:ml-auto flex flex-wrap items-center gap-2">
        <Tag color="blue">今回 LAP {trace.lap.lapNumber}: {formatLapSeconds(trace.lap.timeSeconds)}</Tag>
        {reference && (
          <Tag color="geekblue">
            A={reference.label}: {formatLapSeconds(reference.trace.lap.timeSeconds)}
          </Tag>
        )}
        {setup && <Tag>{setup.sessionType}</Tag>}
      </div>
    </div>
  </section>
);

const FirstTraceCard: React.FC<{ trace: TelemetryTrace }> = ({ trace }) => {
  const profile = traceToLapProfile(trace);
  const isInspectableOnly = !trace.lap.valid || trace.lap.type !== 'NORMAL';
  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-8 text-center">
        {isInspectableOnly ? (
          <WarningOutlined className="text-3xl text-amber-500" />
        ) : (
          <CheckCircleOutlined className="text-3xl text-emerald-500" />
        )}
        <h3 className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
          {isInspectableOnly ? '切り出しログを単独確認できます' : '最初の比較用トレースとして保存されました'}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {isInspectableOnly
            ? `${trace.carModel} / ${trace.circuit} の1ラップ切り出しログです。S/Fラインで閉じたNORMALラップではないため、比較ではなく単独確認として扱います。`
            : `${trace.carModel} / ${trace.circuit} の次回以降の走行で、前回比・自己ベスト比・最大ロス区間を自動で出せます。`}
        </p>
      </section>
      <SingleLapTelemetryView
        title={isInspectableOnly ? '切り出しラップを単独確認' : '今回のラップを単独確認'}
        description="比較相手がなくても、この1本の速度、G、走行ライン、主要指標を確認できます。"
        profile={profile}
        lapTimeSeconds={trace.lap.timeSeconds}
        lapNumber={trace.lap.lapNumber}
        lapType={trace.lap.type}
        carModel={trace.carModel}
        circuit={trace.circuit}
        fileName={trace.source.fileName}
        sourceLabel={trace.source.format}
        path={trace.path}
        qualityFlags={trace.qualityFlags}
      />
    </div>
  );
};

const DebriefMetric: React.FC<{
  label: string;
  value: string;
  detail: string;
  tone: 'good' | 'bad' | 'neutral';
}> = ({ label, value, detail, tone }) => {
  const toneClass = tone === 'good'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'bad'
      ? 'text-red-600 dark:text-red-400'
      : 'text-blue-600 dark:text-blue-400';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 min-h-[132px]">
      <div className="text-xs font-semibold tracking-wider uppercase text-gray-400 dark:text-gray-500">{label}</div>
      <div className={`mt-2 text-lg font-bold leading-snug ${toneClass}`}>{value}</div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{detail}</div>
    </div>
  );
};

function formatSignedSeconds(seconds: number): string {
  return `${seconds >= 0 ? '+' : '-'}${Math.abs(seconds).toFixed(3)}s`;
}

function buildNextAction(readout: CoachingReadout): string {
  const braking = readout.annotations.find((a) => a.text.includes('ブレーキ開始') && a.text.includes('手前'));
  if (braking) return '最大ロス区間でブレーキ開始を少し奥へ寄せる';
  const cornerSpeed = readout.annotations.find((a) => a.text.includes('最小コーナー速度') && a.text.includes('低い'));
  if (cornerSpeed) return '最大ロス区間でボトム速度を落としすぎない';
  if (readout.topOpportunity) return `${readout.topOpportunity}を詳細比較で確認`;
  return '今回の良い区間を次回も再現する';
}

function buildCautions(current: TelemetryTrace, reference: TelemetryTrace): string[] {
  const cautions: string[] = [];
  const airA = reference.conditions.weather.airTemp;
  const airB = current.conditions.weather.airTemp;
  if (airA != null && airB != null && Math.abs(airB - airA) >= 5) cautions.push(`気温差 ${Math.abs(airB - airA).toFixed(0)}度`);
  const trackA = reference.conditions.weather.trackTemp;
  const trackB = current.conditions.weather.trackTemp;
  if (trackA != null && trackB != null && Math.abs(trackB - trackA) >= 8) cautions.push(`路温差 ${Math.abs(trackB - trackA).toFixed(0)}度`);
  if ((current.conditions.tireInfo.productName || current.conditions.tireInfo.brand) !==
      (reference.conditions.tireInfo.productName || reference.conditions.tireInfo.brand)) cautions.push('タイヤ銘柄差');
  if (current.conditions.tireInfo.compound !== reference.conditions.tireInfo.compound) cautions.push('コンパウンド差');
  if (current.lap.type !== 'NORMAL') cautions.push('非計測ラップ');
  return cautions;
}

const CautionTags: React.FC<{
  cautions: string[];
  qualityFlags: TelemetryTraceQualityFlags;
}> = ({ cautions, qualityFlags }) => {
  const qualityCautions = [
    qualityFlags.gpsDropout ? 'GPS欠損あり' : null,
    qualityFlags.estimatedLine ? '推定S/Fライン' : null,
    qualityFlags.lowSampleRate ? '低サンプルレート' : null,
    qualityFlags.singleLapFile ? '単独ラップに近い' : null,
    qualityFlags.missingOperationChannels ? '操作チャンネルなし' : null,
  ].filter((v): v is string => v !== null);
  const all = [...cautions, ...qualityCautions];
  if (all.length === 0) {
    return <Tag color="green" icon={<CheckCircleOutlined />}>大きな注意なし</Tag>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((item) => (
        <Tag key={item} color="gold" icon={<WarningOutlined />}>{item}</Tag>
      ))}
    </div>
  );
};

const QualityTag: React.FC<{ flags: TelemetryTraceQualityFlags }> = ({ flags }) => {
  if (flags.gpsDropout || flags.lowSampleRate) {
    return <Tag color="red" icon={<ExclamationCircleOutlined />}>Limited</Tag>;
  }
  if (flags.estimatedLine || flags.singleLapFile || flags.missingOperationChannels) {
    return <Tag color="gold" icon={<WarningOutlined />}>Usable</Tag>;
  }
  return <Tag color="green" icon={<RiseOutlined />}>Verified</Tag>;
};

function buildSetupDiffs(reference: CarSetup, current: CarSetup, t: TFunction): SetupDiffItem[] {
  const skipSections = new Set(['compare.sections.session', 'compare.sections.lapTime']);
  const diffs: SetupDiffItem[] = [];
  for (const section of resolveCompareSections(buildCompareSections(), t)) {
    if (skipSections.has(section.titleKey)) continue;
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
