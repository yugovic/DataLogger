import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Empty, message } from 'antd';
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
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { Header } from './common/Header';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserSetups } from '../services/setupService';
import { CarSetup } from '../types/setup';

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
    case 'practice': return 'Practice';
    case 'qualifying': return 'Qualifying';
    case 'race': return 'Race';
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

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const data = await getUserSetups(currentUser.uid, 100);
        setSetups(data);
      } catch (e) {
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
        if (t?.before > 0 || t?.after > 0) {
          tirePressureAvg[pos].before += t.before || 0;
          tirePressureAvg[pos].after += t.after || 0;
          tirePressureAvg[pos].count++;
        }
      });
    });

    // Temperature trend
    const tempTrend = setups
      .filter(s => s.weather?.airTemp > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: s.date,
        airTemp: s.weather.airTemp,
        trackTemp: s.weather.trackTemp,
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
          { value: practice, name: 'Practice', itemStyle: { color: '#10b981' } },
          { value: qualifying, name: 'Qualifying', itemStyle: { color: '#8b5cf6' } },
          { value: race, name: 'Race', itemStyle: { color: '#ef4444' } },
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

  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50';
  const headingClass = 'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

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
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-1">
            <DashboardOutlined className="text-xl text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">ダッシュボード</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-8">走行データの統計とサマリー</p>
        </div>

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
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                最初のセットアップを記録する
              </button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>走行回数</span>
                  <span className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CalendarOutlined className="text-blue-500" />
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSessions}</div>
                <div className="text-xs text-gray-400 mt-1">セッション</div>
              </div>

              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>総ラップ数</span>
                  <span className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FieldTimeOutlined className="text-emerald-500" />
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalLaps}</div>
                <div className="text-xs text-gray-400 mt-1">ラップ</div>
              </div>

              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>ベストラップ</span>
                  <span className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ThunderboltOutlined className="text-amber-500" />
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.overallBest ? secondsToLapTime(stats.overallBest.time) : '---'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {stats.overallBest ? stats.overallBest.circuit : '記録なし'}
                </div>
              </div>

              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={headingClass}>サーキット</span>
                  <span className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <EnvironmentOutlined className="text-violet-500" />
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.circuits.length}</div>
                <div className="text-xs text-gray-400 mt-1">コース</div>
              </div>
            </div>

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
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Practice {stats.sessionTypes.practice}</span>
                    )}
                    {stats.sessionTypes.qualifying > 0 && (
                      <span className="text-xs text-violet-600 dark:text-violet-400">Qualifying {stats.sessionTypes.qualifying}</span>
                    )}
                    {stats.sessionTypes.race > 0 && (
                      <span className="text-xs text-red-600 dark:text-red-400">Race {stats.sessionTypes.race}</span>
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
                        <div className="text-lg">{weatherIcon(s.weather?.condition)}</div>
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
