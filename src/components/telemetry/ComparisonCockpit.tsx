// 比較コックピット（段階A・§4.6） — 実パース済みテレメトリで駆動するリッチな2ラップ比較
//
// 構成（上から）:
//   1. デルタT トレース（主役・最上段）— 瞬間ゲイン/ロスで緑/赤に色分け・アノテーションをピン留め
//   2. チャンネル切替バー（利用可能なチャンネルのみ）— 選択チャンネルの重ねチャート
//   3. コースマップ（2ラップのパス + 同期カーソルの現在位置ドット）
//   4. 同期カーソル読み出し（ホバー距離での両ラップの値）
//   5. 指標デルタカード / コーチの読み解き / 区間比較表
//
// 同期カーソル: 単一の cursorDistance（React state）を真実の源とする。
// 各ラインチャートの updateAxisPointer から距離を吸い上げ、全チャート＋マップへ
// 縦カーソル/位置ドットを命令的に反映する（option 全再構築は避け滑らかに）。
//
// 規律: 偽データなし（すべて props で渡る実測由来）。console 不使用。
// 全軸・指標に単位。ダーク対応・xl 未満は1カラム。

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';
import { useTheme } from '../../contexts/ThemeContext';
import { trackEvent } from '../../lib/analytics';
import type { LapSlot } from './LapList';
import { MetricDeltaCards } from './MetricDeltaCards';
import { CoachPanel } from './CoachPanel';
import { SegmentTable } from './SegmentTable';
import {
  buildCoachingReadout,
  computeLapMetrics,
  computeSegmentDeltas,
  deltaT,
  positionAt,
  readoutAt,
  type ChannelAvailability,
  type ChannelKey,
  type LapProfile,
} from '../../lib/telemetry';
import type { Lap, StartFinishLine, TelemetryPoint } from '../../lib/telemetry';
import type { TrackMap } from '../../lib/tracks';
import type { LineSource } from './resolveLapDetection';
import { formatLapSeconds } from './evidence';
import { boundsFromPoints, buildTrackMapOverlay, mergeBounds } from './trackMapOverlay';

// A=基準: 青 / B=比較: アンバー（LapList・TelemetryAnalysis の SLOT_COLORS と一致）
const SLOT_COLORS: Record<LapSlot, string> = { A: '#3b82f6', B: '#f59e0b' };
const GAIN_COLOR = '#10b981'; // B が速い（緑）
const LOSS_COLOR = '#ef4444'; // B が遅い（赤）

/** チャンネルの表示メタ（軸名・整形・系列取得） */
interface ChannelDef {
  key: ChannelKey;
  label: string;
  axisName: string;
  unit: string;
  digits: number;
  pick: (p: LapProfile) => number[];
}

const CHANNEL_DEFS: ChannelDef[] = [
  { key: 'speed', label: '速度', axisName: '速度 (km/h)', unit: ' km/h', digits: 1, pick: (p) => p.speed },
  { key: 'longG', label: '前後G', axisName: '前後G (G)', unit: ' G', digits: 2, pick: (p) => p.longG },
  { key: 'latG', label: '横G', axisName: '横G (G)', unit: ' G', digits: 2, pick: (p) => p.latG },
];

export interface CockpitSlot {
  slot: LapSlot;
  lap: Lap;
  profile: LapProfile;
}

interface ComparisonCockpitProps {
  points: readonly TelemetryPoint[];
  sessionDistance: readonly number[];
  /** A=基準 / B=比較 の2スロット（順に [A, B]） */
  slots: [CockpitSlot, CockpitSlot];
  availability: ChannelAvailability;
  line: StartFinishLine | null;
  lineSource: LineSource | null;
  origin: { lat: number; lon: number };
  trackMap?: TrackMap | null;
  /** コース判定名（解析イベントの付加情報用・任意） */
  trackName?: string | null;
}

type ViewMode = 'simple' | 'detail';

export const ComparisonCockpit: React.FC<ComparisonCockpitProps> = ({
  points,
  sessionDistance,
  slots,
  availability,
  line,
  lineSource,
  origin,
  trackMap,
  trackName,
}) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const channelLabel = (key: ChannelKey) => t(`telemetry.cockpit.channel.${key}`);
  const channelAxisName = (key: ChannelKey) => t(`telemetry.cockpit.channelAxis.${key}`);
  const [a, b] = slots;
  const [view, setView] = useState<ViewMode>('detail');
  const [channel, setChannel] = useState<ChannelKey>('speed');
  // 同期カーソルの真実の源（共通距離 m）。null = 非ホバー
  const [cursorDistance, setCursorDistance] = useState<number | null>(null);

  // ─── 計算（実測由来・メモ化） ──────────────────────────────
  const delta = useMemo(() => deltaT(a.profile, b.profile, 10), [a.profile, b.profile]);
  const metricsA = useMemo(() => computeLapMetrics(a.profile, a.lap.timeSeconds), [a.profile, a.lap]);
  const metricsB = useMemo(() => computeLapMetrics(b.profile, b.lap.timeSeconds), [b.profile, b.lap]);
  const segments = useMemo(() => computeSegmentDeltas(delta, 3), [delta]);
  const coaching = useMemo(
    () => buildCoachingReadout(delta, metricsA, metricsB, segments),
    [delta, metricsA, metricsB, segments],
  );

  // 計測: 有効な2ラップ比較が表示された（KPI: comparison_viewed）
  useEffect(() => {
    if (delta.points.length > 0) {
      trackEvent('comparison_viewed', { circuit: trackName ?? undefined });
    }
  }, [delta.points.length, trackName]);

  const availableChannels = useMemo(
    () => CHANNEL_DEFS.filter((d) => availability[d.key]),
    [availability],
  );
  // 選択チャンネルが使えなくなったら先頭へフォールバック
  useEffect(() => {
    if (!availability[channel] && availableChannels.length > 0) {
      setChannel(availableChannels[0].key);
    }
  }, [availability, channel, availableChannels]);

  const activeDef = availableChannels.find((d) => d.key === channel) ?? availableChannels[0] ?? null;

  // 共通距離長でクランプ（カーソルは比較可能な範囲のみ）
  const commonLength = delta.commonLengthM;

  // ─── 軸スタイル ────────────────────────────────────────────
  const axis = useMemo(
    () => ({
      label: darkMode ? '#9ca3af' : '#6b7280',
      split: darkMode ? 'rgba(156,163,175,0.15)' : 'rgba(107,114,128,0.15)',
      cursor: darkMode ? 'rgba(229,231,235,0.55)' : 'rgba(55,65,81,0.45)',
    }),
    [darkMode],
  );

  // ─── デルタT チャート option（瞬間ゲイン/ロスで色分け） ────────
  const deltaOption = useMemo<echarts.EChartsOption | null>(() => {
    if (delta.points.length < 2) return null;
    const data = delta.points.map((p) => [p.distance, p.delta] as [number, number]);

    // 瞬間傾き（次点との差）で各セグメントを着色 → visualMap(piecewise) で区間色分け
    // ΔT が増加（B が遅くなる）= ロス(赤) / 減少 = ゲイン(緑)
    const slopes = delta.points.map((p, i) => {
      const next = delta.points[i + 1];
      if (!next) return 0;
      return next.delta - p.delta;
    });

    // アノテーションを markPoint としてピン留め
    const annoPoints = coaching.annotations.map((an, i) => {
      const idx = nearestIndex(delta.points, an.distance);
      const yVal = idx >= 0 ? delta.points[idx].delta : 0;
      const color = an.kind === 'loss' ? LOSS_COLOR : an.kind === 'gain' ? GAIN_COLOR : '#0ea5e9';
      return {
        name: `anno-${i}`,
        coord: [an.distance, yVal] as [number, number],
        value: an.text,
        itemStyle: { color },
      };
    });

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: axis.cursor, width: 1 } },
        valueFormatter: (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)} s` : '-'),
      },
      grid: { left: 56, right: 16, top: 24, bottom: 28 },
      xAxis: {
        type: 'value',
        min: 0,
        max: commonLength,
        name: t('telemetry.cockpit.axisDistance'),
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: axis.label, fontSize: 11 },
        axisLabel: { color: axis.label, fontSize: 10 },
        splitLine: { lineStyle: { color: axis.split } },
      },
      yAxis: {
        type: 'value',
        name: t('telemetry.cockpit.axisDeltaT'),
        nameTextStyle: { color: axis.label, fontSize: 11 },
        axisLabel: {
          color: axis.label,
          fontSize: 10,
          formatter: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`,
        },
        splitLine: { lineStyle: { color: axis.split } },
      },
      // 傾き符号で区間色分け（B が遅い側=赤 / 速い側=緑）
      visualMap: {
        show: false,
        type: 'piecewise',
        dimension: 0,
        seriesIndex: 0,
        pieces: delta.points.slice(0, -1).map((p, i) => ({
          gte: p.distance,
          lt: delta.points[i + 1].distance,
          color: slopes[i] > 0 ? LOSS_COLOR : slopes[i] < 0 ? GAIN_COLOR : axis.label,
        })),
        outOfRange: { color: axis.label },
      },
      series: [
        {
          name: 'ΔT',
          type: 'line',
          data,
          showSymbol: false,
          smooth: false,
          lineStyle: { width: 2.4 },
          // ゼロ基準線
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: axis.label, type: 'dashed', width: 1, opacity: 0.5 },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 0, // ピン本体は出さず、ラベルチップで表現
            data: annoPoints,
            label: {
              show: true,
              formatter: (p: echarts.DefaultLabelFormatterCallbackParams) => String(p.value ?? ''),
              fontSize: 9,
              color: '#fff',
              backgroundColor: 'rgba(17,24,39,0.82)',
              padding: [3, 5],
              borderRadius: 4,
              lineHeight: 12,
            },
          },
        },
      ],
    };
  }, [delta, coaching.annotations, axis, commonLength, t]);

  // ─── 選択チャンネルの重ねチャート option ───────────────────
  const channelOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!activeDef || delta.points.length < 2) return null;
    const make = (profile: LapProfile, color: string, name: string): echarts.SeriesOption => {
      const ys = activeDef.pick(profile);
      const data = profile.distance.map((d, i) => [d, ys[i]] as [number, number]);
      return {
        name,
        type: 'line',
        data,
        showSymbol: false,
        lineStyle: { width: 1.8, color },
        itemStyle: { color },
      };
    };
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: axis.cursor, width: 1 } },
        valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(activeDef.digits)}${activeDef.unit}` : '-'),
      },
      legend: { bottom: 0, textStyle: { color: axis.label, fontSize: 11 } },
      grid: { left: 56, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: 'value',
        min: 0,
        max: commonLength,
        name: t('telemetry.cockpit.axisDistance'),
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: axis.label, fontSize: 11 },
        axisLabel: { color: axis.label, fontSize: 10 },
        splitLine: { lineStyle: { color: axis.split } },
      },
      yAxis: {
        type: 'value',
        name: channelAxisName(activeDef.key),
        nameTextStyle: { color: axis.label, fontSize: 11 },
        axisLabel: { color: axis.label, fontSize: 10 },
        splitLine: { lineStyle: { color: axis.split } },
      },
      series: [
        make(a.profile, SLOT_COLORS.A, `A: LAP ${a.lap.lapNumber}`),
        make(b.profile, SLOT_COLORS.B, `B: LAP ${b.lap.lapNumber}`),
      ],
    };
  }, [activeDef, a, b, delta.points.length, axis, commonLength, t]);

  // ─── コースマップ option（2ラップのパス + ライン） ───────────
  const mapOption = useMemo<echarts.EChartsOption | null>(() => {
    const pathA = projectPath(points, sessionDistance, a.lap, origin);
    const pathB = projectPath(points, sessionDistance, b.lap, origin);
    const projectedLine = line ? projectLineXY(line, origin) : [];
    const overlay = buildTrackMapOverlay(trackMap, origin, { darkMode, showLabels: true, t });
    const all = [...pathA, ...pathB];
    const bounds = mergeBounds([boundsFromPoints(all), boundsFromPoints(projectedLine), overlay.bounds]);
    if (!bounds) return null;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const half = (Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2) * 1.08 || 1;

    const series: echarts.SeriesOption[] = [
      ...overlay.series,
      { name: `A: LAP ${a.lap.lapNumber}`, type: 'line', data: pathA, showSymbol: false, lineStyle: { width: 1.6, color: SLOT_COLORS.A, opacity: 0.9 }, itemStyle: { color: SLOT_COLORS.A } },
      { name: `B: LAP ${b.lap.lapNumber}`, type: 'line', data: pathB, showSymbol: false, lineStyle: { width: 1.6, color: SLOT_COLORS.B, opacity: 0.9 }, itemStyle: { color: SLOT_COLORS.B } },
      // 現在位置ドット（2点: A/B）— カーソル連動で命令的に更新
      { id: 'cursorDots', name: 'cursor', type: 'scatter', data: [], symbolSize: 11, z: 10, silent: true, itemStyle: { borderColor: '#fff', borderWidth: 1.5 } },
    ];
    if (line) {
      series.push({
        name: lineSource === 'estimated' ? t('telemetry.cockpit.estimatedBaseline') : t('telemetry.cockpit.controlLine'),
        type: 'line',
        data: projectedLine,
        showSymbol: false,
        lineStyle: { width: 3, color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
      });
    }
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { show: false },
      legend: { bottom: 0, textStyle: { color: axis.label, fontSize: 11 } },
      grid: { left: 8, right: 8, top: 8, bottom: 32 },
      xAxis: { type: 'value', show: false, min: cx - half, max: cx + half },
      yAxis: { type: 'value', show: false, min: cy - half, max: cy + half },
      series,
    };
  }, [points, sessionDistance, a.lap, b.lap, origin, line, lineSource, axis.label, trackMap, darkMode, t]);

  // ─── チャートインスタンス管理 + 同期カーソル ──────────────────
  const deltaRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const deltaChart = useRef<echarts.ECharts | null>(null);
  const channelChart = useRef<echarts.ECharts | null>(null);
  const mapChart = useRef<echarts.ECharts | null>(null);

  // distance を吸い上げるハンドラ（updateAxisPointer の x 値）
  const handleAxisPointer = useRef<(params: unknown) => void>(() => {});
  handleAxisPointer.current = (params: unknown) => {
    const p = params as { axesInfo?: { axisDim?: string; value?: number }[] };
    const xInfo = p.axesInfo?.find((ax) => ax.axisDim === 'x');
    if (xInfo && typeof xInfo.value === 'number' && Number.isFinite(xInfo.value)) {
      setCursorDistance(xInfo.value);
    }
  };

  // 各ラインチャートの init（option 変更時に再構築）
  useChartInstance(deltaRef, deltaChart, deltaOption, darkMode, handleAxisPointer);
  useChartInstance(channelRef, channelChart, channelOption, darkMode, handleAxisPointer);
  // マップは axisPointer を持たない（ホバー元にしない）
  useChartInstance(mapRef, mapChart, mapOption, darkMode, null);

  // cursorDistance → 全チャートへ縦カーソル / マップへ位置ドットを命令的に反映
  useEffect(() => {
    const d = cursorDistance;
    // 縦カーソル markLine（silent・ラベルなし）。null のとき消す
    const cursorMarkLine =
      d === null
        ? { data: [] }
        : {
            silent: true,
            symbol: 'none',
            lineStyle: { color: axis.cursor, width: 1.5, type: 'solid' as const },
            label: { show: false },
            data: [{ xAxis: d }],
            animation: false,
          };

    // デルタT: ゼロ基準線 + カーソル線の2本を維持
    if (deltaChart.current && deltaOption) {
      deltaChart.current.setOption(
        {
          series: [
            {
              markLine:
                d === null
                  ? {
                      silent: true,
                      symbol: 'none',
                      lineStyle: { color: axis.label, type: 'dashed', width: 1, opacity: 0.5 },
                      label: { show: false },
                      data: [{ yAxis: 0 }],
                    }
                  : {
                      silent: true,
                      symbol: 'none',
                      label: { show: false },
                      data: [
                        { yAxis: 0, lineStyle: { color: axis.label, type: 'dashed', width: 1, opacity: 0.5 } },
                        { xAxis: d, lineStyle: { color: axis.cursor, width: 1.5 } },
                      ],
                      animation: false,
                    },
            },
          ],
        },
        { lazyUpdate: true, silent: true },
      );
    }
    if (channelChart.current && channelOption) {
      channelChart.current.setOption(
        { series: [{ markLine: cursorMarkLine }, { markLine: cursorMarkLine }] },
        { lazyUpdate: true, silent: true },
      );
    }
    // マップの現在位置ドット
    if (mapChart.current && mapOption) {
      const dots: { value: [number, number]; itemStyle: { color: string } }[] = [];
      if (d !== null) {
        const posA = positionAt(points, sessionDistance, a.lap, origin, d);
        const posB = positionAt(points, sessionDistance, b.lap, origin, d);
        if (posA) dots.push({ value: posA, itemStyle: { color: SLOT_COLORS.A } });
        if (posB) dots.push({ value: posB, itemStyle: { color: SLOT_COLORS.B } });
      }
      mapChart.current.setOption({ series: [{ id: 'cursorDots', data: dots }] }, { lazyUpdate: true, silent: true });
    }
  }, [cursorDistance, axis, deltaOption, channelOption, mapOption, points, sessionDistance, a.lap, b.lap, origin]);

  // ─── カーソル読み出し（両ラップのその距離での値） ──────────────
  const readout = useMemo(() => {
    if (cursorDistance === null) return null;
    return {
      d: cursorDistance,
      a: readoutAt(a.profile, cursorDistance),
      b: readoutAt(b.profile, cursorDistance),
      deltaAtCursor: interpolateDelta(delta, cursorDistance),
    };
  }, [cursorDistance, a.profile, b.profile, delta]);

  const cardClass =
    'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50';
  const headingClass =
    'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

  if (delta.points.length < 2) {
    return (
      <div className={`${cardClass} px-4 py-8 text-center`}>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('telemetry.cockpit.notComparable')}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {t('telemetry.cockpit.notComparableHint')}
        </p>
      </div>
    );
  }

  const showDetail = view === 'detail';

  return (
    <div className="space-y-4 min-w-0">
      {/* ヘッダー: ラップタイム + 簡易/詳細トグル */}
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Δ B−A</span>
            <span
              className={`font-mono tabular-nums text-lg font-bold ${
                delta.finalDelta <= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {delta.finalDelta >= 0 ? '+' : '−'}
              {Math.abs(delta.finalDelta).toFixed(3)}
            </span>
          </div>
          {/* 簡易/詳細トグル */}
          <div className="sm:ml-auto inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900/40">
            {(['simple', 'detail'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setView(m)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  view === m
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {m === 'simple' ? t('telemetry.cockpit.viewSimple') : t('telemetry.cockpit.viewDetail')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* デルタT トレース（主役・最上段） */}
      <div className={`${cardClass} p-4`}>
        <div className="flex items-baseline justify-between">
          <span className={headingClass}>{t('telemetry.cockpit.cumulativeDeltaT')}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            <span className="text-emerald-500 font-medium">{t('telemetry.cockpit.legendGreen')}</span>={t('telemetry.cockpit.legendBFaster')} /{' '}
            <span className="text-red-500 font-medium">{t('telemetry.cockpit.legendRed')}</span>={t('telemetry.cockpit.legendBSlower')}
          </span>
        </div>
        <div ref={deltaRef} className="w-full h-56 sm:h-64 mt-2" />
      </div>

      {/* カーソル読み出し */}
      <div className={`${cardClass} px-4 py-3`}>
        {readout ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
            <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
              {t('telemetry.cockpit.positionMeters', { value: Math.round(readout.d) })}
            </span>
            <CursorReadoutItem label="A" color={SLOT_COLORS.A} v={readout.a} />
            <CursorReadoutItem label="B" color={SLOT_COLORS.B} v={readout.b} />
            {readout.deltaAtCursor !== null && (
              <span className="font-mono tabular-nums text-xs">
                <span className="text-gray-400">ΔT </span>
                <span className={readout.deltaAtCursor <= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {readout.deltaAtCursor >= 0 ? '+' : '−'}
                  {Math.abs(readout.deltaAtCursor).toFixed(3)}s
                </span>
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('telemetry.cockpit.cursorHint')}
          </p>
        )}
      </div>

      {/* チャンネル切替 + 重ねチャート */}
      {activeDef && (
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={headingClass}>{t('telemetry.cockpit.channelComparison')}</span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900/40">
              {availableChannels.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setChannel(d.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    channel === d.key
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {channelLabel(d.key)}
                </button>
              ))}
            </div>
          </div>
          <div ref={channelRef} className="w-full h-56 sm:h-64 mt-2" />
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {t('telemetry.cockpit.channelNote')}
          </p>
        </div>
      )}

      {/* コーチの読み解き（常時表示） */}
      <CoachPanel readout={coaching} />

      {/* 指標デルタカード（常時表示） */}
      <div className={`${cardClass} p-4`}>
        <span className={headingClass}>{t('telemetry.cockpit.metricDelta')}</span>
        <div className="mt-3">
          <MetricDeltaCards metricsA={metricsA} metricsB={metricsB} />
        </div>
      </div>

      {/* 詳細層: コースマップ + 区間比較表 */}
      {showDetail && (
        <>
          {mapOption && (
            <div className={`${cardClass} p-4`}>
              <span className={headingClass}>{t('telemetry.cockpit.trackMap')}</span>
              <div className="w-full max-w-md mx-auto aspect-square mt-2">
                <div ref={mapRef} className="w-full h-full" />
              </div>
            </div>
          )}
          <div className={`${cardClass} p-4`}>
            <SegmentTable segments={segments} profileA={a.profile} profileB={b.profile} />
          </div>
        </>
      )}
    </div>
  );
};

// ─── カーソル読み出しの1ラップ分 ──────────────────────────────

const CursorReadoutItem: React.FC<{
  label: string;
  color: string;
  v: { speedKmh: number | null; longG: number | null; latG: number | null };
}> = ({ label, color, v }) => {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1.5 font-mono tabular-nums text-xs">
      <span className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: color }}>
        {label}
      </span>
      <span className="text-gray-700 dark:text-gray-200">
        {v.speedKmh !== null ? `${v.speedKmh.toFixed(1)} km/h` : '—'}
      </span>
      {v.longG !== null && (
        <span className="text-gray-400 dark:text-gray-500">{v.longG >= 0 ? '+' : ''}{v.longG.toFixed(2)}{t('telemetry.cockpit.gLong')}</span>
      )}
      {v.latG !== null && (
        <span className="text-gray-400 dark:text-gray-500">{Math.abs(v.latG).toFixed(2)}{t('telemetry.cockpit.gLat')}</span>
      )}
    </span>
  );
};

// ─── echarts インスタンス管理フック ──────────────────────────

/**
 * option 変更時にチャートを破棄→再生成し、axisPointer ハンドラを束ねる。
 * 既存 TelemetryAnalysis の useChart と同じ破棄パターンだが、インスタンス ref を
 * 呼び出し側へ渡して命令的更新（同期カーソル）を可能にする。
 */
function useChartInstance(
  containerRef: React.RefObject<HTMLDivElement>,
  chartRef: React.MutableRefObject<echarts.ECharts | null>,
  option: echarts.EChartsOption | null,
  darkMode: boolean,
  axisPointerHandler: React.MutableRefObject<(params: unknown) => void> | null,
) {
  useEffect(() => {
    if (!containerRef.current || !option) return;
    if (chartRef.current) chartRef.current.dispose();
    const chart = echarts.init(containerRef.current, darkMode ? 'dark' : undefined);
    chart.setOption(option);
    chartRef.current = chart;

    if (axisPointerHandler) {
      chart.on('updateAxisPointer', (params: unknown) => axisPointerHandler.current(params));
    }

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, darkMode]);
}

// ─── 投影ヘルパー（lapMetrics と同等の局所平面投影） ─────────────

function projectPath(
  points: readonly TelemetryPoint[],
  sessionDistance: readonly number[],
  lap: Lap,
  origin: { lat: number; lon: number },
): [number, number][] {
  void sessionDistance;
  const path: [number, number][] = [];
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const mPerDegLat = 111320;
  const mPerDegLon = mPerDegLat * cosLat;
  for (const p of points) {
    if (p.time < lap.startTime) continue;
    if (p.time > lap.endTime) break;
    if (p.lat === null || p.lon === null) continue;
    path.push([(p.lon - origin.lon) * mPerDegLon, (p.lat - origin.lat) * mPerDegLat]);
  }
  return path;
}

function projectLineXY(line: StartFinishLine, origin: { lat: number; lon: number }): [number, number][] {
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const mPerDegLat = 111320;
  const mPerDegLon = mPerDegLat * cosLat;
  return line.map((p) => [(p.lon - origin.lon) * mPerDegLon, (p.lat - origin.lat) * mPerDegLat] as [number, number]);
}

/** delta.points 内で distance に最も近い点の index */
function nearestIndex(pts: { distance: number }[], d: number): number {
  if (pts.length === 0) return -1;
  let best = 0;
  let bestDiff = Math.abs(pts[0].distance - d);
  for (let i = 1; i < pts.length; i++) {
    const diff = Math.abs(pts[i].distance - d);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

/** delta トレースを距離 d で線形補間（カーソル読み出し用） */
function interpolateDelta(delta: { points: { distance: number; delta: number }[] }, d: number): number | null {
  const pts = delta.points;
  if (pts.length === 0) return null;
  if (d <= pts[0].distance) return pts[0].delta;
  if (d >= pts[pts.length - 1].distance) return pts[pts.length - 1].delta;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].distance >= d) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const span = p1.distance - p0.distance;
      if (span <= 0) return p0.delta;
      return p0.delta + (p1.delta - p0.delta) * ((d - p0.distance) / span);
    }
  }
  return pts[pts.length - 1].delta;
}
