import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';
import {
  CarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { computeLapMetrics, type LapProfile, type LapType, type LatLon } from '../../lib/telemetry';
import type { TrackMap } from '../../lib/tracks';
import type { TelemetryTraceQualityFlags } from '../../types/telemetryTrace';
import { formatLapSeconds } from './evidence';
import { boundsFromPoints, buildTrackMapOverlay, mergeBounds } from './trackMapOverlay';

const SPEED_COLOR = '#2563eb';
const LONG_G_COLOR = '#ef4444';
const LAT_G_COLOR = '#10b981';
const PATH_COLOR = '#f59e0b';

export interface SingleLapPath {
  xM: number[];
  yM: number[];
  origin?: LatLon;
}

interface SingleLapTelemetryViewProps {
  title?: string;
  description?: string;
  profile: LapProfile;
  lapTimeSeconds: number;
  lapNumber?: number;
  lapType?: LapType;
  carModel?: string;
  circuit?: string;
  fileName?: string;
  sourceLabel?: string;
  path?: SingleLapPath;
  trackMap?: TrackMap | null;
  qualityFlags?: TelemetryTraceQualityFlags;
}

export const SingleLapTelemetryView: React.FC<SingleLapTelemetryViewProps> = ({
  title,
  description,
  profile,
  lapTimeSeconds,
  lapNumber,
  lapType,
  carModel,
  circuit,
  fileName,
  sourceLabel,
  path,
  trackMap,
  qualityFlags,
}) => {
  const { darkMode } = useTheme();
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('telemetry.singleLap.title');
  const resolvedDescription = description ?? t('telemetry.singleLap.description');
  const metrics = useMemo(() => computeLapMetrics(profile, lapTimeSeconds), [profile, lapTimeSeconds]);
  const axis = useMemo(
    () => ({
      label: darkMode ? '#9ca3af' : '#6b7280',
      split: darkMode ? 'rgba(156,163,175,0.15)' : 'rgba(107,114,128,0.15)',
    }),
    [darkMode],
  );

  const speedOption = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(1)} km/h` : '-'),
    },
    grid: { left: 56, right: 16, top: 16, bottom: 36 },
    xAxis: {
      type: 'value',
      min: 0,
      max: profile.lapLengthM,
      name: t('telemetry.singleLap.axisDistance'),
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    yAxis: {
      type: 'value',
      name: t('telemetry.singleLap.axisSpeed'),
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    series: [
      {
        name: t('telemetry.singleLap.seriesSpeed'),
        type: 'line',
        data: profile.distance.map((dist, i) => [dist, profile.speed[i]]),
        showSymbol: false,
        lineStyle: { color: SPEED_COLOR, width: 2 },
      },
    ],
  }), [axis, profile, t]);

  const gOption = useMemo<echarts.EChartsOption>(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (typeof v === 'number' ? `${v.toFixed(2)} G` : '-'),
    },
    legend: { bottom: 0, textStyle: { color: axis.label, fontSize: 11 } },
    grid: { left: 56, right: 16, top: 16, bottom: 44 },
    xAxis: {
      type: 'value',
      min: 0,
      max: profile.lapLengthM,
      name: t('telemetry.singleLap.axisDistance'),
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    yAxis: {
      type: 'value',
      name: t('telemetry.singleLap.axisG'),
      nameTextStyle: { color: axis.label, fontSize: 11 },
      axisLabel: { color: axis.label, fontSize: 10 },
      splitLine: { lineStyle: { color: axis.split } },
    },
    series: [
      {
        name: t('telemetry.singleLap.seriesLongG'),
        type: 'line',
        data: profile.distance.map((dist, i) => [dist, profile.longG[i]]),
        showSymbol: false,
        lineStyle: { color: LONG_G_COLOR, width: 1.6 },
      },
      {
        name: t('telemetry.singleLap.seriesLatG'),
        type: 'line',
        data: profile.distance.map((dist, i) => [dist, profile.latG[i]]),
        showSymbol: false,
        lineStyle: { color: LAT_G_COLOR, width: 1.6 },
      },
    ],
  }), [axis, profile, t]);

  const pathOption = useMemo<echarts.EChartsOption | null>(() => {
    const points = path && path.xM.length >= 2 && path.yM.length === path.xM.length
      ? path.xM.map((x, i) => [x, path.yM[i]] as [number, number])
      : [];
    const overlay = path?.origin
      ? buildTrackMapOverlay(trackMap, path.origin, { darkMode, showLabels: true, t })
      : { series: [], bounds: null };
    const bounds = mergeBounds([boundsFromPoints(points), overlay.bounds]);
    if (!bounds) return null;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const half = (Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2) * 1.08 || 1;
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { show: false },
      grid: { left: 8, right: 8, top: 8, bottom: 8 },
      xAxis: { type: 'value', show: false, min: cx - half, max: cx + half },
      yAxis: { type: 'value', show: false, min: cy - half, max: cy + half },
      series: [
        ...overlay.series,
        ...(points.length >= 2
          ? [{
              name: t('telemetry.singleLap.racingLine'),
              type: 'line' as const,
              data: points,
              showSymbol: false,
              lineStyle: { width: 1.8, color: PATH_COLOR },
            }]
          : []),
      ],
    };
  }, [darkMode, path, trackMap, t]);

  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50';
  const headingClass = 'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

  return (
    <div className="space-y-4">
      <section className={`${cardClass} p-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{resolvedTitle}</h3>
              {lapType && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  lapType === 'NORMAL'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {lapType}
                </span>
              )}
              {sourceLabel && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {sourceLabel}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{resolvedDescription}</p>
          </div>
          <div className="lg:ml-auto">
            <div className="font-mono tabular-nums text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLapSeconds(lapTimeSeconds)}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 text-left lg:text-right">
              {lapNumber ? `LAP ${lapNumber}` : t('telemetry.singleLap.selectedLap')}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {carModel && <span className="inline-flex items-center gap-1"><CarOutlined />{carModel}</span>}
          {circuit && <span className="inline-flex items-center gap-1"><EnvironmentOutlined />{circuit}</span>}
          {fileName && <span className="inline-flex items-center gap-1 min-w-0"><FileTextOutlined /><span className="truncate max-w-[260px]">{fileName}</span></span>}
        </div>

        {(lapType && lapType !== 'NORMAL') && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            <WarningOutlined className="text-amber-500 text-xs mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              {t('telemetry.singleLap.incompleteLapWarning')}
            </p>
          </div>
        )}

        {qualityFlags && (
          <QualityFlags flags={qualityFlags} />
        )}
      </section>

      <section className={`${cardClass} p-4`}>
        <span className={headingClass}>{t('telemetry.singleLap.keyMetrics')}</span>
        <SingleMetricGrid metrics={[
          { label: t('telemetry.singleLap.metricLapTime'), value: `${lapTimeSeconds.toFixed(3)}s` },
          { label: t('telemetry.singleLap.metricLapDistance'), value: `${profile.lapLengthM.toFixed(0)}m` },
          { label: t('telemetry.singleLap.metricTopSpeed'), value: formatMetric(metrics.topSpeedKmh, 1, ' km/h') },
          { label: t('telemetry.singleLap.metricMinCornerSpeed'), value: formatMetric(metrics.minCornerSpeedKmh, 1, ' km/h') },
          { label: t('telemetry.singleLap.metricMaxBrakingG'), value: formatMetric(metrics.maxBrakingG, 2, ' G') },
          { label: t('telemetry.singleLap.metricMaxLatG'), value: formatMetric(metrics.maxLatG, 2, ' G') },
          { label: t('telemetry.singleLap.metricBrakingPoint'), value: formatMetric(metrics.brakingPointM, 0, ' m') },
          { label: t('telemetry.singleLap.metricSampleCount'), value: `${profile.distance.length}` },
        ]} />
      </section>

      <section className={`${cardClass} p-4`}>
        <span className={headingClass}>{t('telemetry.singleLap.speedProfile')}</span>
        <EChart option={speedOption} darkMode={darkMode} className="h-56 sm:h-64 mt-2" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <section className={`${cardClass} p-4`}>
          <span className={headingClass}>{t('telemetry.singleLap.gProfile')}</span>
          <EChart option={gOption} darkMode={darkMode} className="h-56 sm:h-64 mt-2" />
        </section>
        {pathOption && (
          <section className={`${cardClass} p-4`}>
            <span className={headingClass}>{t('telemetry.singleLap.racingLine')}</span>
            <EChart option={pathOption} darkMode={darkMode} className="aspect-square mt-2" />
          </section>
        )}
      </div>
    </div>
  );
};

const SingleMetricGrid: React.FC<{ metrics: { label: string; value: string }[] }> = ({ metrics }) => (
  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
    {metrics.map((metric) => (
      <div
        key={metric.label}
        className="rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2.5"
      >
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{metric.label}</div>
        <div className="mt-0.5 font-mono tabular-nums text-sm font-semibold text-gray-800 dark:text-gray-100">
          {metric.value}
        </div>
      </div>
    ))}
  </div>
);

const QualityFlags: React.FC<{ flags: TelemetryTraceQualityFlags }> = ({ flags }) => {
  const { t } = useTranslation();
  const items = [
    flags.gpsDropout ? t('telemetry.singleLap.flagGpsDropout') : null,
    flags.estimatedLine ? t('telemetry.singleLap.flagEstimatedLine') : null,
    flags.singleLapFile ? t('telemetry.singleLap.flagSingleLapFile') : null,
    flags.lowSampleRate ? t('telemetry.singleLap.flagLowSampleRate') : null,
    flags.missingOperationChannels ? t('telemetry.singleLap.flagMissingOperationChannels') : null,
  ].filter((v): v is string => v !== null);
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300"
        >
          <WarningOutlined />
          {item}
        </span>
      ))}
    </div>
  );
};

function formatMetric(value: number | null, digits: number, unit: string): string {
  return value === null ? '-' : `${value.toFixed(digits)}${unit}`;
}

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
