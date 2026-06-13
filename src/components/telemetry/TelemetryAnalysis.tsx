// テレメトリ分析ページ（/telemetry, WP5）
//
// 旧 /demo/telemetry（ハードコードモック）の実データ版。ロガーファイルを
// その場で読み込み、同一セッション内のラップ2本を重ねて比較する。
// 生テレメトリはクライアント内処理のみ（サーバー保存はベータ範囲外 —
// 証憑として永続化するのはラップタイム+メタデータだけ）。

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { LineChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { Header } from '../common/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { formatLapDelta, formatLapSeconds } from './evidence';
import {
  calcLapMaxSpeeds,
  deriveSessionSeries,
  firstGpsPoint,
  projectLapPath,
  projectLine,
  sliceLapSeries,
} from './lapMetrics';
import { LapList } from './LapList';
import type { LapSlot } from './LapList';
import { DropZone, ImportErrorPanel, ImportProgress, SessionSummaryPanel } from './ImportPanels';
import { useTelemetryImport } from './useTelemetryImport';

// ─── ECharts hook（Dashboard.tsx と同じ初期化パターン） ──────

const useChart = (option: echarts.EChartsOption | null, darkMode: boolean) => {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !option) return;
    if (chartRef.current) {
      chartRef.current.dispose();
    }
    const chart = echarts.init(ref.current, darkMode ? 'dark' : undefined);
    chart.setOption(option);
    chartRef.current = chart;

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [option, darkMode]);

  return ref;
};

// ラップA/Bの系列色（A=基準: 青 / B=比較: アンバー。LapList のスロット色と一致）
const SLOT_COLORS: Record<LapSlot, string> = { A: '#3b82f6', B: '#f59e0b' };

export const TelemetryAnalysis: React.FC = () => {
  const { darkMode } = useTheme();
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

  const derived = useMemo(
    () => (result ? deriveSessionSeries(result.session.points) : null),
    [result],
  );

  const maxSpeeds = useMemo(
    () => (result ? calcLapMaxSpeeds(result.session.points, result.detection.laps) : []),
    [result],
  );

  const slots = useMemo(() => {
    if (!result || !derived) return [];
    return (['A', 'B'] as const).flatMap((slot) => {
      const index = selection[slot];
      if (index === undefined) return [];
      const lap = result.detection.laps[index];
      if (!lap) return [];
      return [{ slot, lap, series: sliceLapSeries(result.session.points, derived, lap) }];
    });
  }, [result, derived, selection]);

  const lapDelta = useMemo(() => {
    if (slots.length !== 2) return null;
    return slots[1].lap.timeSeconds - slots[0].lap.timeSeconds;
  }, [slots]);

  // ─── チャートオプション ──────────────────────────────────

  const axisCommon = useMemo(
    () => ({
      axisLabelColor: darkMode ? '#9ca3af' : '#6b7280',
      splitLineColor: darkMode ? 'rgba(156,163,175,0.15)' : 'rgba(107,114,128,0.15)',
    }),
    [darkMode],
  );

  const buildXyChart = useMemo(() => {
    return (
      data: { name: string; color: string; points: [number, number][] }[],
      yName: string,
      yFormatter: (v: number) => string,
    ): echarts.EChartsOption | null => {
      if (data.length === 0) return null;
      return {
        backgroundColor: 'transparent',
        animation: false,
        tooltip: {
          trigger: 'axis',
          valueFormatter: (v) => (typeof v === 'number' ? yFormatter(v) : '-'),
        },
        legend: {
          bottom: 0,
          textStyle: { color: axisCommon.axisLabelColor, fontSize: 11 },
        },
        grid: { left: 52, right: 16, top: 16, bottom: 52 },
        xAxis: {
          type: 'value',
          name: '距離 (m)',
          nameLocation: 'middle',
          nameGap: 26,
          nameTextStyle: { color: axisCommon.axisLabelColor, fontSize: 11 },
          axisLabel: { color: axisCommon.axisLabelColor, fontSize: 10 },
          splitLine: { lineStyle: { color: axisCommon.splitLineColor } },
          max: 'dataMax',
        },
        yAxis: {
          type: 'value',
          name: yName,
          nameTextStyle: { color: axisCommon.axisLabelColor, fontSize: 11 },
          axisLabel: { color: axisCommon.axisLabelColor, fontSize: 10 },
          splitLine: { lineStyle: { color: axisCommon.splitLineColor } },
        },
        series: data.map((d) => ({
          name: d.name,
          type: 'line' as const,
          data: d.points,
          showSymbol: false,
          lineStyle: { width: 1.6, color: d.color },
          itemStyle: { color: d.color },
        })),
      };
    };
  }, [axisCommon]);

  const slotSeriesName = (slot: LapSlot, lapNumber: number) => `${slot}: LAP ${lapNumber}`;

  const speedOption = useMemo(
    () =>
      buildXyChart(
        slots.map((s) => ({
          name: slotSeriesName(s.slot, s.lap.lapNumber),
          color: SLOT_COLORS[s.slot],
          points: s.series.speed,
        })),
        '速度 (km/h)',
        (v) => `${v.toFixed(1)} km/h`,
      ),
    [slots, buildXyChart],
  );

  const longGOption = useMemo(
    () =>
      buildXyChart(
        slots.map((s) => ({
          name: slotSeriesName(s.slot, s.lap.lapNumber),
          color: SLOT_COLORS[s.slot],
          points: s.series.longG,
        })),
        '前後G (G)',
        (v) => `${v.toFixed(2)} G`,
      ),
    [slots, buildXyChart],
  );

  // 走行ライン（局所平面投影、縦横等スケール）
  const pathOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!result || slots.length === 0) return null;
    const origin =
      result.line !== null
        ? { lat: (result.line[0].lat + result.line[1].lat) / 2, lon: (result.line[0].lon + result.line[1].lon) / 2 }
        : firstGpsPoint(result.session.points);
    if (!origin) return null;

    const paths = slots.map((s) => ({
      slot: s.slot,
      lapNumber: s.lap.lapNumber,
      points: projectLapPath(result.session.points, s.lap, origin),
    }));
    const allPoints = paths.flatMap((p) => p.points);
    if (allPoints.length === 0) return null;

    // 縦横等スケール: 正方形コンテナ + 同一スパンの min/max
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of allPoints) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const half = (Math.max(maxX - minX, maxY - minY) / 2) * 1.08 || 1;

    const series: echarts.SeriesOption[] = paths.map((p) => ({
      name: slotSeriesName(p.slot, p.lapNumber),
      type: 'line' as const,
      data: p.points,
      showSymbol: false,
      lineStyle: { width: 1.4, color: SLOT_COLORS[p.slot], opacity: 0.9 },
      itemStyle: { color: SLOT_COLORS[p.slot] },
    }));

    if (result.line) {
      series.push({
        name: result.lineSource === 'estimated' ? '基準線（自動推定）' : 'コントロールライン',
        type: 'line' as const,
        data: projectLine(result.line, origin),
        showSymbol: false,
        lineStyle: { width: 3, color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
      });
    }

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { show: false },
      legend: {
        bottom: 0,
        textStyle: { color: axisCommon.axisLabelColor, fontSize: 11 },
      },
      grid: { left: 8, right: 8, top: 8, bottom: 32 },
      xAxis: { type: 'value', show: false, min: cx - half, max: cx + half },
      yAxis: { type: 'value', show: false, min: cy - half, max: cy + half },
      series,
    };
  }, [result, slots, axisCommon]);

  const speedRef = useChart(speedOption, darkMode);
  const longGRef = useChart(longGOption, darkMode);
  const pathRef = useChart(pathOption, darkMode);

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
              <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-4">
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

                {/* 比較ビュー */}
                <div className="space-y-4 min-w-0">
                  {/* ラップタイム差 */}
                  {slots.length > 0 && (
                    <div className={`${cardClass} p-4`}>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        {slots.map((s) => (
                          <div key={s.slot} className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                              style={{ backgroundColor: SLOT_COLORS[s.slot] }}
                            >
                              {s.slot}
                            </span>
                            <span className="text-xs text-gray-400">LAP {s.lap.lapNumber}</span>
                            <span className="font-mono tabular-nums text-lg font-semibold text-gray-800 dark:text-gray-100">
                              {formatLapSeconds(s.lap.timeSeconds)}
                            </span>
                          </div>
                        ))}
                        {lapDelta !== null && (
                          <div className="flex items-center gap-2 sm:ml-auto">
                            <span className="text-xs text-gray-400">Δ B−A</span>
                            <span
                              className={`font-mono tabular-nums text-lg font-bold ${
                                lapDelta <= 0
                                  ? 'text-emerald-500'
                                  : 'text-red-500'
                              }`}
                            >
                              {formatLapDelta(lapDelta)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 速度 vs 距離 */}
                  {speedOption && (
                    <div className={`${cardClass} p-4`}>
                      <span className={headingClass}>速度 vs 距離</span>
                      <div ref={speedRef} className="w-full h-64 sm:h-72 mt-2" />
                    </div>
                  )}

                  {/* 前後G vs 距離 */}
                  {longGOption && (
                    <div className={`${cardClass} p-4`}>
                      <span className={headingClass}>前後G vs 距離</span>
                      <div ref={longGRef} className="w-full h-48 sm:h-56 mt-2" />
                    </div>
                  )}

                  {/* 走行ライン */}
                  {pathOption && (
                    <div className={`${cardClass} p-4`}>
                      <span className={headingClass}>走行ライン</span>
                      <div className="w-full max-w-md mx-auto aspect-square mt-2">
                        <div ref={pathRef} className="w-full h-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
