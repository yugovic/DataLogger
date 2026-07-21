// テレメトリ取込・分析ページ（/telemetry/import, WP5 → 比較コックピット段階A）
//
// 旧 /demo/telemetry（ハードコードモック）の実データ版。ロガーファイルを
// その場で読み込み、同一セッション内のラップ2本（A=ベスト/B=ターゲット）を
// リッチに比較する（デルタT・チャンネル切替・同期カーソル・コースマップ・
// 指標デルタ・コーチ読み解き・区間比較）。
// 生テレメトリはクライアント内処理のみ（サーバー保存はベータ範囲外 —
// 証憑として永続化するのはラップタイム+メタデータだけ）。

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { AreaChartOutlined, LineChartOutlined, ReloadOutlined, CarOutlined, EnvironmentOutlined, SwapOutlined } from '@ant-design/icons';
import { Header } from '../common/Header';
import { calcLapMaxSpeeds, firstGpsPoint } from './lapMetrics';
import { LapList } from './LapList';
import type { LapSlot } from './LapList';
import { DropZone, ImportErrorPanel, ImportProgress, SessionSummaryPanel } from './ImportPanels';
import { useTelemetryImport } from './useTelemetryImport';
import { ComparisonCockpit, type CockpitSlot } from './ComparisonCockpit';
import { SingleLapTelemetryView, type SingleLapPath } from './SingleLapTelemetryView';
import { buildLapProfile, channelAvailability, deriveCompareSeries } from '../../lib/telemetry';
import type { Lap } from '../../lib/telemetry';
import { makeLocalProjection } from '../../lib/telemetry/geo';
import { getSetup } from '../../services/setupService';
import type { CarSetup } from '../../types/setup';
import logger from '../../utils/logger';

export const TelemetryAnalysis: React.FC = () => {
  const { t } = useTranslation();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  const { phase, result, error, busy, importFile, reset } = useTelemetryImport();
  const [pendingFileName, setPendingFileName] = useState<string | undefined>(undefined);
  const [selection, setSelection] = useState<Partial<Record<LapSlot, number>>>({});

  // セットアップ記録から ?setup=<id> 付きで来た場合、そのセットを文脈として表示する
  // （生テレメトリは未永続化のため、同じロガーファイルを再取込してもらう導線）
  const [searchParams] = useSearchParams();
  const contextSetupId = searchParams.get('setup');
  const [contextSetup, setContextSetup] = useState<CarSetup | null>(null);
  useEffect(() => {
    if (!contextSetupId) {
      setContextSetup(null);
      return;
    }
    let active = true;
    getSetup(contextSetupId)
      .then((s) => { if (active) setContextSetup(s); })
      .catch((e) => logger.error('文脈セットの取得に失敗:', e));
    return () => { active = false; };
  }, [contextSetupId]);

  // 取込結果が変わったら選択を初期化:
  // NORMAL があれば A=ベスト / B=2番手、NORMAL がなければ最も長い切り出しラップを単独表示する。
  useEffect(() => {
    if (!result) {
      setSelection({});
      return;
    }
    const { laps, bestLapIndex } = result.detection;
    const next: Partial<Record<LapSlot, number>> = {};
    let a = bestLapIndex ?? undefined;
    if (a === undefined && laps.length > 0) {
      a = laps.reduce((longest, lap, i) => (
        lap.timeSeconds > laps[longest].timeSeconds ? i : longest
      ), 0);
    }
    if (a !== undefined) {
      next.A = a;
      let secondBest: number | undefined;
      laps.forEach((lap, i) => {
        if (i === a || lap.type !== 'NORMAL') return;
        if (secondBest === undefined || lap.timeSeconds < laps[secondBest].timeSeconds) {
          secondBest = i;
        }
      });
      if (secondBest !== undefined) next.B = secondBest;
    }
    setSelection(next);
  }, [result]);

  const handleSelect = (index: number) => {
    setSelection((prev) => {
      const lap = result?.detection.laps[index];
      if (lap && lap.type !== 'NORMAL') return { A: index };
      if (prev.A === index) return { B: prev.B }; // タップで選択解除
      if (prev.B === index) return { A: prev.A };
      if (prev.A === undefined) return { ...prev, A: index };
      if (prev.B === undefined) return { ...prev, B: index };
      return { A: prev.A, B: index }; // 両方選択済みなら B を入れ替え
    });
  };

  // ─── 派生データ（セッション単位で1回だけ計算） ───────────

  const compareSeries = useMemo(
    () => (result ? deriveCompareSeries(result.session.points) : null),
    [result],
  );

  const maxSpeeds = useMemo(
    () => (result ? calcLapMaxSpeeds(result.session.points, result.detection.laps) : []),
    [result],
  );

  const availability = useMemo(
    () => (result ? channelAvailability(result.session.points) : null),
    [result],
  );

  // 軌跡投影の基準点: コントロールライン中点（あれば）か最初のGPS点
  const origin = useMemo(() => {
    if (!result) return null;
    if (result.line !== null) {
      return {
        lat: (result.line[0].lat + result.line[1].lat) / 2,
        lon: (result.line[0].lon + result.line[1].lon) / 2,
      };
    }
    return firstGpsPoint(result.session.points);
  }, [result]);

  // 選択中の2スロット（A=基準, B=比較）の距離プロファイル
  const cockpitSlots = useMemo<[CockpitSlot, CockpitSlot] | null>(() => {
    if (!result || !compareSeries) return null;
    const built = (['A', 'B'] as const).flatMap((slot) => {
      const index = selection[slot];
      if (index === undefined) return [];
      const lap = result.detection.laps[index];
      if (!lap || lap.type !== 'NORMAL') return [];
      const profile = buildLapProfile(
        result.session.points,
        compareSeries.distance,
        compareSeries.longG,
        compareSeries.latG,
        lap,
      );
      return [{ slot, lap, profile } as CockpitSlot];
    });
    if (built.length !== 2) return null;
    return [built[0], built[1]];
  }, [result, compareSeries, selection]);

  const singleLapSlot = useMemo<CockpitSlot | null>(() => {
    if (!result || !compareSeries) return null;
    const index = selection.A ?? selection.B;
    if (index === undefined) return null;
    const lap = result.detection.laps[index];
    if (!lap) return null;
    const profile = buildLapProfile(
      result.session.points,
      compareSeries.distance,
      compareSeries.longG,
      compareSeries.latG,
      lap,
    );
    return { slot: 'A', lap, profile };
  }, [result, compareSeries, selection]);

  const singleLapPath = useMemo(
    () => (result && singleLapSlot ? buildSingleLapPath(result.session.points, singleLapSlot.lap) : undefined),
    [result, singleLapSlot],
  );

  // ─── Render ──────────────────────────────────────────────

  const cardClass =
    'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50';
  const headingClass =
    'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <LineChartOutlined className="text-xl text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('telemetry.analysis.pageTitle')}</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 ml-8 text-sm">
              {t('telemetry.analysis.pageSubtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/telemetry"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <AreaChartOutlined />
              {t('telemetry.analysis.traceListLink')}
            </Link>
            <Link
              to="/telemetry/files"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <SwapOutlined />
              {t('telemetry.analysis.compareFilesLink')}
            </Link>
          </div>
        </div>

        {/* セット文脈ストリップ: 記録から来た場合に「どのセッションか」を併記（§4.6 セット文脈） */}
        {contextSetup && (
          <div className="mb-5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
              <span className="font-medium text-blue-700 dark:text-blue-300">{t('telemetry.analysis.sessionSetup')}</span>
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <CarOutlined className="text-gray-400" />{contextSetup.carModel || t('telemetry.analysis.carUnset')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                <EnvironmentOutlined className="text-gray-400" />{contextSetup.circuit || t('telemetry.analysis.circuitUnset')}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {contextSetup.date instanceof Date ? contextSetup.date.toLocaleDateString('ja-JP') : ''}
              </span>
              <Link to={`/setup/${contextSetup.id}`} className="ml-auto text-blue-500 dark:text-blue-400 hover:underline whitespace-nowrap">
                {t('telemetry.analysis.openRecord')}
              </Link>
            </div>
            {contextSetup.lapTimeData?.evidence?.fileName && phase !== 'done' && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t('telemetry.analysis.previousLoggerLabel')}<span className="font-mono">{contextSetup.lapTimeData.evidence.fileName}</span>
                {' '}{t('telemetry.analysis.previousLoggerReselect')}
              </p>
            )}
          </div>
        )}

        {(phase === 'idle' || busy) && (
          <div className="max-w-2xl mx-auto space-y-4">
            <DropZone
              onFile={(file) => {
                setPendingFileName(file.name);
                importFile(file);
              }}
              disabled={busy}
            />
            <ImportProgress phase={phase} fileName={pendingFileName} />
          </div>
        )}

        {phase === 'error' && error && (
          <div className="max-w-2xl mx-auto">
            <ImportErrorPanel message={error} onRetry={reset} />
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-4">
            {/* サマリー + やり直し */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <SessionSummaryPanel result={result} />
              </div>
              <button
                onClick={reset}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <ReloadOutlined />
                {t('telemetry.analysis.anotherFile')}
              </button>
            </div>

            {result.detection.laps.length === 0 ? (
              <div className={`${cardClass} px-4 py-10 text-center`}>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('telemetry.analysis.noLapsDetected')}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  {t('telemetry.analysis.noLapsHint')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
                {/* ラップ選択 */}
                <div className={`${cardClass} p-4 self-start`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={headingClass}>{t('telemetry.analysis.lapListTitle')}</span>
                    <span className="text-[11px] text-gray-400">{t('telemetry.analysis.tapToSelectTwo')}</span>
                  </div>
                  <LapList
                    laps={result.detection.laps}
                    bestLapIndex={result.detection.bestLapIndex}
                    maxSpeeds={maxSpeeds}
                    selection={selection}
                    onSelect={handleSelect}
                  />
                </div>

                {/* 比較コックピット */}
                {cockpitSlots && availability && origin ? (
                  <ComparisonCockpit
                    points={result.session.points}
                    sessionDistance={compareSeries!.distance}
                    slots={cockpitSlots}
                    availability={availability}
                    line={result.line}
                    lineSource={result.lineSource}
                    origin={origin}
                    trackMap={result.track?.map}
                    trackName={result.track?.name ?? null}
                  />
                ) : singleLapSlot ? (
                  <div className="self-start">
                    <SingleLapTelemetryView
                      title={t('telemetry.analysis.singleLapTitle')}
                      description={t('telemetry.analysis.singleLapDescription')}
                      profile={singleLapSlot.profile}
                      lapTimeSeconds={singleLapSlot.lap.timeSeconds}
                      lapNumber={singleLapSlot.lap.lapNumber}
                      lapType={singleLapSlot.lap.type}
                      circuit={result.track?.name ?? contextSetup?.circuit ?? t('telemetry.analysis.courseUnknown')}
                      carModel={contextSetup?.carModel}
                      fileName={result.fileName}
                      sourceLabel={result.session.meta.format}
                      path={singleLapPath}
                      trackMap={result.track?.map}
                    />
                  </div>
                ) : (
                  <div className={`${cardClass} px-4 py-10 text-center self-start`}>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('telemetry.analysis.selectLapPrompt')}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {t('telemetry.analysis.selectLapHint')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

function buildSingleLapPath(points: readonly { time: number; lat: number | null; lon: number | null }[], lap: Lap): SingleLapPath | undefined {
  const originPoint = points.find((p) => (
    p.time >= lap.startTime &&
    p.time <= lap.endTime &&
    p.lat !== null &&
    p.lon !== null
  ));
  if (!originPoint || originPoint.lat === null || originPoint.lon === null) return undefined;

  const origin = { lat: originPoint.lat, lon: originPoint.lon };
  const { toXY } = makeLocalProjection(origin);
  const xM: number[] = [];
  const yM: number[] = [];
  for (const point of points) {
    if (point.time < lap.startTime) continue;
    if (point.time > lap.endTime) break;
    if (point.lat === null || point.lon === null) continue;
    const xy = toXY({ lat: point.lat, lon: point.lon });
    xM.push(Math.round(xy.x * 100) / 100);
    yM.push(Math.round(xy.y * 100) / 100);
  }
  return xM.length >= 2 ? { xM, yM, origin } : undefined;
}
