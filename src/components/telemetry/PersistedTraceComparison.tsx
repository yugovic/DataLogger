// 保存済み TelemetryTrace 同士の比較表示（Phase B1）

import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CarOutlined, EnvironmentOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { trackEvent } from '../../lib/analytics';
import {
  buildCoachingReadout,
  computeLapMetrics,
  computeSegmentDeltas,
  deltaT,
  traceToLapProfile,
} from '../../lib/telemetry';
import { findTrackById } from '../../lib/tracks';
import type { TelemetryTrace } from '../../types/telemetryTrace';
import { formatLapSeconds } from './evidence';
import { CoachPanel } from './CoachPanel';
import { MetricDeltaCards } from './MetricDeltaCards';
import { SegmentTable } from './SegmentTable';
import { boundsFromPoints, buildTrackMapOverlay, mergeBounds } from './trackMapOverlay';

const A_COLOR = '#3b82f6';
const B_COLOR = '#f59e0b';
const GAIN_COLOR = '#10b981';
const LOSS_COLOR = '#ef4444';

interface PersistedTraceComparisonProps {
  traceA: TelemetryTrace;
  traceB: TelemetryTrace;
}

export const PersistedTraceComparison: React.FC<PersistedTraceComparisonProps> = ({ traceA, traceB }) => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const profileA = useMemo(() => traceToLapProfile(traceA), [traceA]);
  const profileB = useMemo(() => traceToLapProfile(traceB), [traceB]);
  const d = useMemo(() => deltaT(profileA, profileB, 10), [profileA, profileB]);
  const metricsA = useMemo(() => computeLapMetrics(profileA, traceA.lap.timeSeconds), [profileA, traceA]);
  const metricsB = useMemo(() => computeLapMetrics(profileB, traceB.lap.timeSeconds), [profileB, traceB]);
  const segments = useMemo(() => computeSegmentDeltas(d, 3), [d]);
  const trackMap = useMemo(
    () => (traceA.trackId ? findTrackById(traceA.trackId)?.map : null) ?? (traceB.trackId ? findTrackById(traceB.trackId)?.map : null),
    [traceA.trackId, traceB.trackId],
  );
  const coaching = useMemo(
    () => buildCoachingReadout(d, metricsA, metricsB, segments),
    [d, metricsA, metricsB, segments],
  );

  useEffect(() => {
    if (d.points.length > 0) {
      trackEvent('comparison_viewed', { circuit: traceA.circuit, car_model: traceA.carModel });
    }
  }, [d.points.length, traceA.circuit, traceA.carModel]);

  const axis = useMemo(
    () => ({
      label: darkMode ? '#9ca3af' : '#6b7280',
      split: darkMode ? 'rgba(156,163,175,0.15)' : 'rgba(107,114,128,0.15)',
    }),
    [darkMode],
  );

  const deltaOption = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(3)} s` : '-'),
    },
    grid: { left: 56, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: 'value',
      min: 0,
      max: d.commonLengthM,
      name: t('telemetry.persisted.distanceAxis'),
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    yAxis: {
      type: 'value',
      name: 'ΔT B-A (s)',
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    series: [
      {
        name: 'ΔT',
        type: 'line',
        data: d.points.map((p) => [p.distance, p.delta]),
        showSymbol: false,
        lineStyle: { width: 2.4, color: d.finalDelta <= 0 ? GAIN_COLOR : LOSS_COLOR },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: axis.label, type: 'dashed', width: 1, opacity: 0.5 },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
    ],
  }), [axis, d, t]);

  const speedOption = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(1)} km/h` : '-'),
    },
    legend: { bottom: 0, textStyle: { color: axis.label, fontSize: 11 } },
    grid: { left: 56, right: 16, top: 16, bottom: 44 },
    xAxis: {
      type: 'value',
      min: 0,
      max: Math.min(profileA.lapLengthM, profileB.lapLengthM),
      name: t('telemetry.persisted.distanceAxis'),
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    yAxis: {
      type: 'value',
      name: t('telemetry.persisted.speedAxis'),
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    series: [
      {
        name: `A: ${formatLapSeconds(traceA.lap.timeSeconds)}`,
        type: 'line',
        data: profileA.distance.map((dist, i) => [dist, profileA.speed[i]]),
        showSymbol: false,
        lineStyle: { color: A_COLOR, width: 1.8 },
      },
      {
        name: `B: ${formatLapSeconds(traceB.lap.timeSeconds)}`,
        type: 'line',
        data: profileB.distance.map((dist, i) => [dist, profileB.speed[i]]),
        showSymbol: false,
        lineStyle: { color: B_COLOR, width: 1.8 },
      },
    ],
  }), [axis, profileA, profileB, traceA, traceB, t]);

  const mapOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!traceA.path || !traceB.path) return null;
    const pathA = traceA.path.xM.map((x, i) => [x, traceA.path!.yM[i]] as [number, number]);
    const pathB = traceB.path.xM.map((x, i) => [x, traceB.path!.yM[i]] as [number, number]);
    const overlay = buildTrackMapOverlay(trackMap, traceA.path.origin, { darkMode, showLabels: true });
    const all = [...pathA, ...pathB];
    const bounds = mergeBounds([boundsFromPoints(all), overlay.bounds]);
    if (!bounds) return null;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const half = (Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2) * 1.08 || 1;
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { show: false },
      legend: { bottom: 0, textStyle: { color: axis.label, fontSize: 11 } },
      grid: { left: 8, right: 8, top: 8, bottom: 32 },
      xAxis: { type: 'value', show: false, min: cx - half, max: cx + half },
      yAxis: { type: 'value', show: false, min: cy - half, max: cy + half },
      series: [
        ...overlay.series,
        { name: 'A', type: 'line', data: pathA, showSymbol: false, lineStyle: { width: 1.6, color: A_COLOR } },
        { name: 'B', type: 'line', data: pathB, showSymbol: false, lineStyle: { width: 1.6, color: B_COLOR } },
      ],
    };
  }, [axis.label, darkMode, trackMap, traceA.path, traceB.path]);

  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50';
  const headingClass = 'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
  const finalDelta = traceB.lap.timeSeconds - traceA.lap.timeSeconds;

  return (
    <div className="space-y-4">
      <div className={`${cardClass} p-4`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <TraceHeaderBadge label="A" color={A_COLOR} trace={traceA} />
          <TraceHeaderBadge label="B" color={B_COLOR} trace={traceB} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">B-A</span>
            <span className={`font-mono tabular-nums text-lg font-bold ${finalDelta <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {finalDelta >= 0 ? '+' : '-'}{Math.abs(finalDelta).toFixed(3)}s
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
          {[traceA, traceB].map((tr, i) => (
            <div key={tr.id ?? i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><CarOutlined />{tr.carModel}</span>
              <span className="inline-flex items-center gap-1"><EnvironmentOutlined />{tr.circuit}</span>
              <span className="inline-flex items-center gap-1 min-w-0">
                <FileTextOutlined />
                <span className="truncate max-w-[220px]">{tr.source.fileName}</span>
              </span>
              {tr.setupId ? (
                <Link to={`/setup/${tr.setupId}`} className="text-blue-500 dark:text-blue-400 hover:underline">
                  {t('telemetry.persisted.openRecord')}
                </Link>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">{t('telemetry.persisted.localFile')}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <CoachPanel readout={coaching} />

      <div className={`${cardClass} p-4`}>
        <div className="flex items-baseline justify-between">
          <span className={headingClass}>{t('telemetry.persisted.cumulativeTimeDiff')}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{t('telemetry.persisted.deltaSignHint')}</span>
        </div>
        <EChart option={deltaOption} darkMode={darkMode} className="h-56 sm:h-64 mt-2" />
      </div>

      <div className={`${cardClass} p-4`}>
        <span className={headingClass}>{t('telemetry.persisted.speedComparison')}</span>
        <EChart option={speedOption} darkMode={darkMode} className="h-56 sm:h-64 mt-2" />
        {(traceA.qualityFlags.missingOperationChannels || traceB.qualityFlags.missingOperationChannels) && (
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {t('telemetry.persisted.gpsOnlyNotice')}
          </p>
        )}
      </div>

      <div className={`${cardClass} p-4`}>
        <span className={headingClass}>{t('telemetry.persisted.metricDelta')}</span>
        <div className="mt-3">
          <MetricDeltaCards metricsA={metricsA} metricsB={metricsB} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className={`${cardClass} p-4`}>
          <SegmentTable segments={segments} profileA={profileA} profileB={profileB} />
        </div>
        {mapOption && (
          <div className={`${cardClass} p-4`}>
            <span className={headingClass}>{t('telemetry.persisted.racingLine')}</span>
            <EChart option={mapOption} darkMode={darkMode} className="aspect-square mt-2" />
          </div>
        )}
      </div>
    </div>
  );
};

const TraceHeaderBadge: React.FC<{ label: string; color: string; trace: TelemetryTrace }> = ({ label, color, trace }) => (
  <div className="flex items-center gap-2">
    <span
      className="w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
    <span className="text-xs text-gray-400">LAP {trace.lap.lapNumber}</span>
    <span className="font-mono tabular-nums text-lg font-semibold text-gray-800 dark:text-gray-100">
      {formatLapSeconds(trace.lap.timeSeconds)}
    </span>
  </div>
);

const EChart: React.FC<{ option: echarts.EChartsOption; darkMode: boolean; className: string }> = ({
  option,
  darkMode,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, darkMode ? 'dark' : undefined);
    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [option, darkMode]);
  return <div ref={ref} className={`w-full ${className}`} />;
};
