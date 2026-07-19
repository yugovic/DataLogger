import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkbox, Spin, Empty, message } from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  CloudOutlined,
  FireOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  RightOutlined,
  CarOutlined,
  ExperimentOutlined,
  SunOutlined,
  CloudFilled,
  BulbOutlined,
  RiseOutlined,
  ShareAltOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { Header } from './common/Header';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserSetups } from '../services/setupService';
import { createPublicShare } from '../services/publicShareService';
import { CarSetup } from '../types/setup';
import { downloadShareImage, shareViaWebShare } from '../utils/shareImage';

// ─── Helper functions ───────────────────────────────────────

/** "1:23.456" → seconds as number */
const lapTimeToSeconds = (time: string): number | null => {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (isNaN(min) || isNaN(sec)) return null;
    return min * 60 + sec;
  }
  const sec = parseFloat(time);
  return isNaN(sec) ? null : sec;
};

/** seconds → "1:23.456" */
const secondsToLapTime = (s: number): string => {
  const min = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3);
  return min > 0 ? `${min}:${parseFloat(sec) < 10 ? '0' : ''}${sec}` : sec;
};

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
};

const weatherIcon = (condition: string) => {
  switch (condition) {
    case '晴れ': return <SunOutlined className="text-orange-400" />;
    case '曇り': return <CloudFilled className="text-gray-400" />;
    case 'ウェット': return <CloudOutlined className="text-blue-400" />;
    case 'フルウェット': return <CloudOutlined className="text-blue-600" />;
    default: return <CloudOutlined />;
  }
};

const sessionLabel = (t: string) => {
  switch (t) {
    case 'practice': return '練習走行';
    case 'qualifying': return '予選';
    case 'race': return 'レース';
    default: return t;
  }
};

const sessionColor = (t: string) => {
  switch (t) {
    case 'practice': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'qualifying': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
    case 'race': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    default: return 'bg-gray-500/10 text-gray-600';
  }
};

// ─── ECharts hook ───────────────────────────────────────────

const useChart = (
  option: echarts.EChartsOption | null,
  darkMode: boolean,
) => {
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

// ─── Main Component ─────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { darkMode } = useTheme();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [setups, setSetups] = useState<CarSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [includePublicLinkInGrowthShare, setIncludePublicLinkInGrowthShare] = useState(false);
  const [growthShareUrl, setGrowthShareUrl] = useState<string | null>(null);
  const [growthSharing, setGrowthSharing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const data = await getUserSetups(currentUser.uid, 100);
        setSetups(data);
      } catch (_e) {
        message.error('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser]);

  // ─── Derived stats ──────────────────────────────────────

  const stats = useMemo(() => {
    if (setups.length === 0) return null;

    const totalSessions = setups.length;
    const circuits = [...new Set(setups.map(s => s.circuit).filter(Boolean))];
    const cars = [...new Set(setups.map(s => s.carModel).filter(Boolean))];
    const totalLaps = setups.reduce((acc, s) => acc + (s.lapTimeData?.totalLaps || s.lapTimeData?.laps?.length || 0), 0);

    // Best lap per circuit
    const bestByCircuit: Record<string, { time: number; setup: CarSetup }> = {};
    setups.forEach(s => {
      if (!s.circuit || !s.lapTimeData?.bestLap) return;
      const sec = lapTimeToSeconds(s.lapTimeData.bestLap);
      if (sec === null) return;
      if (!bestByCircuit[s.circuit] || sec < bestByCircuit[s.circuit].time) {
        bestByCircuit[s.circuit] = { time: sec, setup: s };
      }
    });

    // Overall best lap
    let overallBest: { time: number; circuit: string; date: Date } | null = null;
    for (const [circuit, { time, setup }] of Object.entries(bestByCircuit)) {
      if (!overallBest || time < overallBest.time) {
        overallBest = { time, circuit, date: setup.date };
      }
    }

    // Session type breakdown
    const sessionTypes = { practice: 0, qualifying: 0, race: 0 };
    setups.forEach(s => {
      if (s.sessionType in sessionTypes) sessionTypes[s.sessionType as keyof typeof sessionTypes]++;
    });

    // Weather breakdown
    const weatherCounts: Record<string, number> = {};
    setups.forEach(s => {
      if (s.weather?.condition) {
        weatherCounts[s.weather.condition] = (weatherCounts[s.weather.condition] || 0) + 1;
      }
    });

    // Circuit frequency
    const circuitCounts: Record<string, number> = {};
    setups.forEach(s => {
      if (s.circuit) circuitCounts[s.circuit] = (circuitCounts[s.circuit] || 0) + 1;
    });

    // Lap time trend (chronological, best lap per session)
    const lapTrend = setups
      .filter(s => s.lapTimeData?.bestLap && s.circuit)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        setup: s,
        date: s.date,
        circuit: s.circuit,
        bestLap: lapTimeToSeconds(s.lapTimeData!.bestLap!)!,
        bestLapStr: s.lapTimeData!.bestLap!,
        sessionType: s.sessionType,
      }));

    // Tire pressure averages
    const tirePressureAvg = {
      fl: { before: 0, after: 0, count: 0 },
      fr: { before: 0, after: 0, count: 0 },
      rl: { before: 0, after: 0, count: 0 },
      rr: { before: 0, after: 0, count: 0 },
    };
    setups.forEach(s => {
      if (!s.tireSettings) return;
      (['fl', 'fr', 'rl', 'rr'] as const).forEach(pos => {
        const t = s.tireSettings[pos];
        // null フィールドは集計から除外（0として混ぜない）
        if (t?.before != null && t?.after != null) {
          tirePressureAvg[pos].before += t.before;
          tirePressureAvg[pos].after += t.after;
          tirePressureAvg[pos].count++;
        }
      });
    });

    // Temperature trend (null フィールドを除外)
    const tempTrend = setups
      .filter(s => s.weather?.airTemp != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: s.date,
        airTemp: s.weather.airTemp as number,
        trackTemp: s.weather.trackTemp as number,
      }));

    // Knowledge notes (latest ones)
    const knowledgeNotes = setups
      .filter(s => s.knowledge && (s.knowledge.intention || s.knowledge.result || s.knowledge.learning))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(s => ({
        date: s.date,
        circuit: s.circuit,
        sessionType: s.sessionType,
        ...s.knowledge!,
      }));

    // Recent sessions
    const recentSessions = setups
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Monthly session counts
    const monthlyCounts: Record<string, number> = {};
    setups.forEach(s => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
    });

    return {
      totalSessions,
      circuits,
      cars,
      totalLaps,
      overallBest,
      bestByCircuit,
      sessionTypes,
      weatherCounts,
      circuitCounts,
      lapTrend,
      tirePressureAvg,
      tempTrend,
      knowledgeNotes,
      recentSessions,
      monthlyCounts,
    };
  }, [setups]);

  // ─── Chart options ──────────────────────────────────────

  const lapTrendOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!stats?.lapTrend.length) return null;

    // Group by circuit for multi-line
    const circuits = [...new Set(stats.lapTrend.map(l => l.circuit))];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          return params.map((p: any) =>
            `<span style="color:${p.color}">${p.seriesName}</span>: ${secondsToLapTime(p.value[1])}`
          ).join('<br/>');
        },
      },
      legend: {
        data: circuits,
        textStyle: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 },
        bottom: 0,
      },
      grid: { top: 10, right: 20, bottom: 40, left: 50 },
      xAxis: {
        type: 'time',
        axisLabel: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
          formatter: '{MM}/{dd}',
        },
        axisLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        axisLabel: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
          formatter: (v: number) => secondsToLapTime(v),
        },
        splitLine: { lineStyle: { color: darkMode ? '#1f2937' : '#f3f4f6' } },
      },
      series: circuits.map(circuit => ({
        name: circuit,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: stats.lapTrend
          .filter(l => l.circuit === circuit)
          .map(l => [new Date(l.date).getTime(), l.bestLap]),
      })),
    };
  }, [stats, darkMode]);

  const sessionDistOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!stats) return null;
    const { practice, qualifying, race } = stats.sessionTypes;
    if (practice + qualifying + race === 0) return null;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: darkMode ? '#1f2937' : '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: [
          { value: practice, name: '練習走行', itemStyle: { color: '#10b981' } },
          { value: qualifying, name: '予選', itemStyle: { color: '#8b5cf6' } },
          { value: race, name: 'レース', itemStyle: { color: '#ef4444' } },
        ].filter(d => d.value > 0),
      }],
    };
  }, [stats, darkMode]);

  const weatherDistOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!stats?.weatherCounts || Object.keys(stats.weatherCounts).length === 0) return null;
    const colorMap: Record<string, string> = {
      '晴れ': '#f59e0b',
      '曇り': '#9ca3af',
      'ウェット': '#3b82f6',
      'フルウェット': '#1d4ed8',
    };
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        itemStyle: { borderRadius: 6, borderColor: darkMode ? '#1f2937' : '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: Object.entries(stats.weatherCounts).map(([name, value]) => ({
          value,
          name,
          itemStyle: { color: colorMap[name] || '#6b7280' },
        })),
      }],
    };
  }, [stats, darkMode]);

  const monthlyActivityOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!stats?.monthlyCounts || Object.keys(stats.monthlyCounts).length === 0) return null;
    const entries = Object.entries(stats.monthlyCounts).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 10, right: 15, bottom: 25, left: 40 },
      xAxis: {
        type: 'category',
        data: entries.map(([k]) => k),
        axisLabel: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 },
        axisLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: darkMode ? '#1f2937' : '#f3f4f6' } },
      },
      series: [{
        type: 'bar',
        data: entries.map(([, v]) => v),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#1d4ed8' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '60%',
      }],
    };
  }, [stats, darkMode]);

  const circuitBarOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!stats?.circuitCounts || Object.keys(stats.circuitCounts).length === 0) return null;
    const entries = Object.entries(stats.circuitCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 10, right: 15, bottom: 5, left: 10, containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: darkMode ? '#1f2937' : '#f3f4f6' } },
      },
      yAxis: {
        type: 'category',
        data: entries.map(([k]) => k).reverse(),
        axisLabel: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 },
        axisLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } },
      },
      series: [{
        type: 'bar',
        data: entries.map(([, v]) => v).reverse(),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#8b5cf6' },
            { offset: 1, color: '#a78bfa' },
          ]),
          borderRadius: [0, 4, 4, 0],
        },
        barWidth: '60%',
      }],
    };
  }, [stats, darkMode]);

  const copyGrowthShareUrl = async () => {
    if (!growthShareUrl) return;
    try {
      await navigator.clipboard.writeText(growthShareUrl);
      message.success('公開リンクをコピーしました');
    } catch {
      message.error('公開リンクのコピーに失敗しました');
    }
  };

  const tirePressureOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!stats) return null;
    const { tirePressureAvg } = stats;
    const positions = ['FL', 'FR', 'RL', 'RR'] as const;
    const keys = ['fl', 'fr', 'rl', 'rr'] as const;
    const hasTireData = keys.some(k => tirePressureAvg[k].count > 0);
    if (!hasTireData) return null;

    const beforeData = keys.map(k =>
      tirePressureAvg[k].count > 0 ? +(tirePressureAvg[k].before / tirePressureAvg[k].count).toFixed(1) : 0
    );
    const afterData = keys.map(k =>
      tirePressureAvg[k].count > 0 ? +(tirePressureAvg[k].after / tirePressureAvg[k].count).toFixed(1) : 0
    );

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['走行前', '走行後'],
        textStyle: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 },
        bottom: 0,
      },
      grid: { top: 10, right: 15, bottom: 35, left: 45 },
      xAxis: {
        type: 'category',
        data: positions,
        axisLabel: { color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11, fontWeight: 'bold' },
        axisLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
          formatter: '{value} kPa',
        },
        splitLine: { lineStyle: { color: darkMode ? '#1f2937' : '#f3f4f6' } },
      },
      series: [
        {
          name: '走行前',
          type: 'bar',
          data: beforeData,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
          barGap: '10%',
        },
        {
          name: '走行後',
          type: 'bar',
          data: afterData,
          itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [stats, darkMode]);

  // Chart refs
  const lapTrendRef = useChart(lapTrendOption, darkMode);
  const sessionDistRef = useChart(sessionDistOption, darkMode);
  const weatherDistRef = useChart(weatherDistOption, darkMode);
  const monthlyActivityRef = useChart(monthlyActivityOption, darkMode);
  const circuitBarRef = useChart(circuitBarOption, darkMode);
  const tirePressureRef = useChart(tirePressureOption, darkMode);

  // ─── Render ─────────────────────────────────────────────

  const cardClass = 'bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.04)]';
  const headingClass = 'text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]';
  const iconShellClass = 'grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950';
  const statValueClass = 'font-mono text-3xl font-black tracking-normal text-slate-950 dark:text-white';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />

      <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-5 lg:px-6">
        {/* Page title */}
        <div className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-white">
                  <DashboardOutlined />
                </span>
                <span className={headingClass}>Operations Overview</span>
              </div>
              <h2 className="text-2xl font-black leading-tight tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                ダッシュボード
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                セットアップ、ラップ、車両、走行ログを横断して次の改善ポイントを判断します。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                記録する
              </button>
              <button
                onClick={() => navigate('/telemetry')}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                走行ログ
              </button>
            </div>
          </div>
          <div className="h-1 bg-[linear-gradient(90deg,#2563eb_0%,#2563eb_22%,#0f172a_22%,#0f172a_44%,#e2e8f0_44%,#e2e8f0_100%)] dark:bg-[linear-gradient(90deg,#3b82f6_0%,#3b82f6_22%,#f8fafc_22%,#f8fafc_44%,#1e293b_44%,#1e293b_100%)]" />
        </div>

        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className={headingClass}>最終走行</div>
              <div className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">
                {stats.recentSessions[0]?.circuit || '未記録'}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className={headingClass}>登録車両</div>
              <div className="mt-2 font-mono text-lg font-black text-slate-900 dark:text-white">{stats.cars.length}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className={headingClass}>ベスト会場</div>
              <div className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">{stats.overallBest?.circuit || '記録なし'}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className={headingClass}>データ蓄積</div>
              <div className="mt-2 font-mono text-lg font-black text-slate-900 dark:text-white">
                {stats.totalSessions > 0 ? `${Math.round(stats.totalLaps / stats.totalSessions)}` : '0'} <span className="text-xs font-bold text-slate-500">周/回</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Spin size="large" />
          </div>
        ) : !stats ? (
          <div className={`${cardClass} p-12`}>
            <Empty
              description="まだセットアップデータがありません"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <button
                onClick={() => navigate('/')}
                className="mt-4 rounded-md bg-slate-950 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                最初のセットアップを記録する
              </button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>走行回数</span>
                  <span className={iconShellClass}>
                    <CalendarOutlined className="text-blue-600 dark:text-blue-400" />
                  </span>
                </div>
                <div className={statValueClass}>{stats.totalSessions}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">セッション</div>
              </div>

              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>総ラップ数</span>
                  <span className={iconShellClass}>
                    <FieldTimeOutlined className="text-emerald-500" />
                  </span>
                </div>
                <div className={statValueClass}>{stats.totalLaps}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">ラップ</div>
              </div>

              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>ベストラップ</span>
                  <span className={iconShellClass}>
                    <ThunderboltOutlined className="text-amber-500" />
                  </span>
                </div>
                <div className={statValueClass}>
                  {stats.overallBest ? secondsToLapTime(stats.overallBest.time) : '---'}
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stats.overallBest ? stats.overallBest.circuit : '記録なし'}
                </div>
              </div>

              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>サーキット</span>
                  <span className={iconShellClass}>
                    <EnvironmentOutlined className="text-blue-600 dark:text-blue-400" />
                  </span>
                </div>
                <div className={statValueClass}>{stats.circuits.length}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">コース</div>
              </div>
            </div>

            {/* ─── Growth Summary (P0-2) + Share (P1-1) ─── */}
            {stats && stats.lapTrend.length >= 2 && (
              <div className={`${cardClass} p-5`}>
                <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <RiseOutlined className="text-emerald-500" />
                      <span className={headingClass}>成長タイムライン</span>
                    </div>
                    <label className="mt-2 flex items-start gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Checkbox
                        checked={includePublicLinkInGrowthShare}
                        onChange={(event) => setIncludePublicLinkInGrowthShare(event.target.checked)}
                        className="mt-0.5 shrink-0"
                      />
                      <span>
                        公開リンクを発行して画像に含める
                        <span className="mt-0.5 block font-normal text-slate-400 dark:text-slate-500">
                          発行すると誰でも閲覧できる公開ページが作られます。履歴ページの「公開リンク管理」からいつでも削除できます。
                        </span>
                      </span>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {growthShareUrl && (
                      <button
                        onClick={copyGrowthShareUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
                      >
                        <CopyOutlined style={{ fontSize: 13 }} />
                        公開リンクをコピー
                      </button>
                    )}
                    <button
                      disabled={growthSharing}
                      onClick={async () => {
                        const trend = stats.lapTrend;
                        const last = trend[trend.length - 1];
                        const first = trend[0];
                        const delta = first.bestLap - last.bestLap;
                        const shareData = {
                          circuit: last.circuit,
                          carModel: last.setup.carModel,
                          bestLap: secondsToLapTime(last.bestLap),
                          dateLabel: formatDate(last.date),
                          deltaSeconds: delta,
                          sessionType: sessionLabel(last.sessionType),
                        };

                        try {
                          setGrowthSharing(true);
                          let shareUrl: string | undefined;
                          if (includePublicLinkInGrowthShare) {
                            const shareId = await createPublicShare(last.setup);
                            shareUrl = `${window.location.origin}/s/${shareId}`;
                            setGrowthShareUrl(shareUrl);
                          }

                          const dataWithLink = { ...shareData, shareUrl };
                          const shared = await shareViaWebShare(dataWithLink);
                          if (!shared) {
                            await downloadShareImage(dataWithLink);
                            message.success('シェア画像をダウンロードしました');
                          }
                          if (shareUrl) {
                            message.success('公開リンクを発行しました');
                          }
                        } catch (error) {
                          console.error('Growth share error:', error);
                          message.error('シェア画像の作成に失敗しました');
                        } finally {
                          setGrowthSharing(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <ShareAltOutlined style={{ fontSize: 13 }} />
                      {growthSharing ? '作成中' : 'シェア'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-3">
                  {(() => {
                    const trend = stats.lapTrend;
                    const first = trend[0];
                    const last = trend[trend.length - 1];
                    const delta = first.bestLap - last.bestLap;
                    const improved = delta > 0;
                    return (
                      <>
                        <div className="text-center bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">開始時</div>
                          <div className="mt-1 font-mono text-xl font-black text-slate-700 dark:text-slate-300">
                            {secondsToLapTime(first.bestLap)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(first.date)} ・ {first.circuit}
                          </div>
                        </div>
                        <div className={`text-center rounded-lg p-3 ${improved ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            改善幅
                          </div>
                          <div className={`mt-1 font-mono text-2xl font-black ${improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {improved ? '−' : '+'}{Math.abs(delta).toFixed(3)}s
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {trend.length}セッション分
                          </div>
                        </div>
                        <div className="text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3">
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">現在</div>
                          <div className="mt-1 font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {secondsToLapTime(last.bestLap)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(last.date)} ・ {last.circuit}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ─── Lap Time Trend (wide) ─── */}
            {lapTrendOption && (
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <RiseOutlined className="text-blue-500" />
                    <span className={headingClass}>ラップタイム推移</span>
                  </div>
                </div>
                <div ref={lapTrendRef} className="w-full h-72" />
              </div>
            )}

            {/* ─── Middle row: Session / Weather / Monthly ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sessionDistOption && (
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <FireOutlined className="text-red-500" />
                    <span className={headingClass}>セッション種別</span>
                  </div>
                  <div ref={sessionDistRef} className="w-full h-48" />
                  <div className="flex justify-center gap-4 mt-2">
                    {stats.sessionTypes.practice > 0 && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">練習走行 {stats.sessionTypes.practice}</span>
                    )}
                    {stats.sessionTypes.qualifying > 0 && (
                      <span className="text-xs text-violet-600 dark:text-violet-400">予選 {stats.sessionTypes.qualifying}</span>
                    )}
                    {stats.sessionTypes.race > 0 && (
                      <span className="text-xs text-red-600 dark:text-red-400">レース {stats.sessionTypes.race}</span>
                    )}
                  </div>
                </div>
              )}

              {weatherDistOption && (
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <CloudOutlined className="text-blue-400" />
                    <span className={headingClass}>天候分布</span>
                  </div>
                  <div ref={weatherDistRef} className="w-full h-48" />
                  <div className="flex justify-center gap-3 mt-2">
                    {Object.entries(stats.weatherCounts).map(([w, c]) => (
                      <span key={w} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        {weatherIcon(w)} {w} {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {monthlyActivityOption && (
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <CalendarOutlined className="text-blue-500" />
                    <span className={headingClass}>月別走行回数</span>
                  </div>
                  <div ref={monthlyActivityRef} className="w-full h-52" />
                </div>
              )}
            </div>

            {/* ─── Circuit + Tire Pressure ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circuitBarOption && (
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <EnvironmentOutlined className="text-violet-500" />
                    <span className={headingClass}>サーキット別走行回数</span>
                  </div>
                  <div ref={circuitBarRef} className="w-full h-64" />
                </div>
              )}

              {tirePressureOption && (
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <ExperimentOutlined className="text-amber-500" />
                    <span className={headingClass}>平均タイヤ空気圧</span>
                  </div>
                  <div ref={tirePressureRef} className="w-full h-64" />
                </div>
              )}
            </div>

            {/* ─── Best Laps Table + Recent Sessions ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Best Laps by Circuit */}
              {Object.keys(stats.bestByCircuit).length > 0 && (
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <TrophyOutlined className="text-amber-500" />
                    <span className={headingClass}>サーキット別ベストラップ</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.bestByCircuit)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([circuit, { time, setup }]) => (
                        <div
                          key={circuit}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <EnvironmentOutlined className="text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{circuit}</div>
                              <div className="text-xs text-gray-400">{formatDate(setup.date)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                              {secondsToLapTime(time)}
                            </div>
                            <div className={`text-xs px-1.5 py-0.5 rounded ${sessionColor(setup.sessionType)}`}>
                              {sessionLabel(setup.sessionType)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <FieldTimeOutlined className="text-emerald-500" />
                    <span className={headingClass}>最近のセッション</span>
                  </div>
                  <button
                    onClick={() => navigate('/history')}
                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    すべて表示 <RightOutlined style={{ fontSize: 10 }} />
                  </button>
                </div>
                <div className="space-y-2">
                  {stats.recentSessions.map((s, i) => (
                    <div
                      key={s.id || i}
                      onClick={() => s.id && navigate(`/setup/${s.id}`)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{weatherIcon(s.weather?.condition ?? '')}</div>
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {s.circuit || '---'}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatDate(s.date)}</span>
                            <span>{s.carModel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {s.lapTimeData?.bestLap && (
                          <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                            {s.lapTimeData.bestLap}
                          </div>
                        )}
                        <div className={`text-xs px-1.5 py-0.5 rounded inline-block ${sessionColor(s.sessionType)}`}>
                          {sessionLabel(s.sessionType)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── Knowledge Notes ─── */}
            {stats.knowledgeNotes.length > 0 && (
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center space-x-2 mb-4">
                  <BulbOutlined className="text-amber-500" />
                  <span className={headingClass}>ナレッジノート</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.knowledgeNotes.map((note, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400">{formatDate(note.date)}</span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{note.circuit}</span>
                      </div>
                      {note.intention && (
                        <div className="mb-1.5">
                          <span className="text-xs font-semibold text-blue-500 mr-1">意図:</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">{note.intention}</span>
                        </div>
                      )}
                      {note.result && (
                        <div className="mb-1.5">
                          <span className="text-xs font-semibold text-emerald-500 mr-1">結果:</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">{note.result}</span>
                        </div>
                      )}
                      {note.learning && (
                        <div>
                          <span className="text-xs font-semibold text-amber-500 mr-1">学び:</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">{note.learning}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Cars summary ─── */}
            {stats.cars.length > 0 && (
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center space-x-2 mb-4">
                  <CarOutlined className="text-blue-500" />
                  <span className={headingClass}>使用車両</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.cars.map(car => {
                    const count = setups.filter(s => s.carModel === car).length;
                    return (
                      <div
                        key={car}
                        className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 flex items-center gap-3"
                      >
                        <CarOutlined className="text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{car}</div>
                          <div className="text-xs text-gray-400">{count} セッション</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 py-6 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 VELOCITY LOGGER. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
