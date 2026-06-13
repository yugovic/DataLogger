// テレメトリ分析ページ（/telemetry, WP5 → 比較コックピット段階A）
//
// 旧 /demo/telemetry（ハードコードモック）の実データ版。ロガーファイルを
// その場で読み込み、同一セッション内のラップ2本（A=ベスト/B=ターゲット）を
// リッチに比較する（デルタT・チャンネル切替・同期カーソル・コースマップ・
// 指標デルタ・コーチ読み解き・区間比較）。
// 生テレメトリはクライアント内処理のみ（サーバー保存はベータ範囲外 —
// 証憑として永続化するのはラップタイム+メタデータだけ）。

import React, { useEffect, useMemo, useState } from 'react';
import { LineChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { Header } from '../common/Header';
import { calcLapMaxSpeeds, firstGpsPoint } from './lapMetrics';
import { LapList } from './LapList';
import type { LapSlot } from './LapList';
import { DropZone, ImportErrorPanel, ImportProgress, SessionSummaryPanel } from './ImportPanels';
import { useTelemetryImport } from './useTelemetryImport';
import { ComparisonCockpit, type CockpitSlot } from './ComparisonCockpit';
import { buildLapProfile, channelAvailability, deriveCompareSeries } from '../../lib/telemetry';

export const TelemetryAnalysis: React.FC = () => {
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  const { phase, result, error, busy, importFile, reset } = useTelemetryImport();
  const [pendingFileName, setPendingFileName] = useState<string | undefined>(undefined);
  const [selection, setSelection] = useState<Partial<Record<LapSlot, number>>>({});

  // 取込結果が変わったら選択を初期化: A=ベスト、B=2番手の計測周
  useEffect(() => {
    if (!result) {
      setSelection({});
      return;
    }
    const { laps, bestLapIndex } = result.detection;
    const next: Partial<Record<LapSlot, number>> = {};
    const a = bestLapIndex ?? (laps.length > 0 ? 0 : undefined);
    if (a !== undefined) {
      next.A = a;
      let secondBest: number | undefined;
      laps.forEach((lap, i) => {
        if (i === a || lap.type !== 'NORMAL') return;
        if (secondBest === undefined || lap.timeSeconds < laps[secondBest].timeSeconds) {
          secondBest = i;
        }
      });
      if (secondBest === undefined && laps.length > 1) {
        secondBest = a === 0 ? 1 : 0;
      }
      if (secondBest !== undefined) next.B = secondBest;
    }
    setSelection(next);
  }, [result]);

  const handleSelect = (index: number) => {
    setSelection((prev) => {
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
      if (!lap) return [];
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
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-1">
            <LineChartOutlined className="text-xl text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">テレメトリ分析</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-8 text-sm">
            ロガーファイルからラップを検出し、2本を重ねて比較します（処理はすべて端末内）
          </p>
        </div>

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
                別のファイル
              </button>
            </div>

            {result.detection.laps.length === 0 ? (
              <div className={`${cardClass} px-4 py-10 text-center`}>
                <p className="text-sm text-gray-600 dark:text-gray-300">周回を検出できませんでした</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  コントロールラインを2回以上通過した周回データが必要です。
                  コースがDB未登録の場合は3周以上の走行データで自動推定できます。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
                {/* ラップ選択 */}
                <div className={`${cardClass} p-4 self-start`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={headingClass}>ラップ一覧</span>
                    <span className="text-[11px] text-gray-400">タップして2本選択</span>
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
                    trackName={result.track?.name ?? null}
                  />
                ) : (
                  <div className={`${cardClass} px-4 py-10 text-center self-start`}>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      比較する2本のラップを選択してください
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      左の一覧から A（基準）と B（比較）をタップで選びます
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
