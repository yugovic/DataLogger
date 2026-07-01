import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Empty, Select, Spin, message } from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  ToolOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildJournalTimeline,
  computeModImpacts,
  toJournalSessions,
  type JournalEvent,
  type JournalSession,
  type ModImpact,
} from '../../lib/buildJournal';
import { estimateModLevel, MOD_LEVEL_LABELS } from '../../lib/modLevel';
import { getUserSetups } from '../../services/setupService';
import { getVehicle } from '../../services/vehicleService';
import { MOD_CATEGORY_LABELS, type ModificationEntry, type Vehicle } from '../../types/vehicle';
import { Header } from '../common/Header';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
const ROI_NOTE = '参考値（走行条件・ドライバーの上達の影響を含みます）';

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const formatLapSeconds = (seconds: number): string => {
  const totalMs = Math.round(seconds * 1000);
  const min = Math.floor(totalMs / 60000);
  const sec = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${min}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

const formatSignedSeconds = (seconds: number): string => {
  const rounded = Math.round(seconds * 1000) / 1000;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '±';
  return `${sign}${Math.abs(rounded).toFixed(3)}`;
};

const formatYen = (value: number): string => `${value.toLocaleString('ja-JP')}円`;

const sortedDatedModifications = (modifications: ModificationEntry[]): Array<ModificationEntry & { installedAt: Date }> =>
  modifications
    .filter((modification): modification is ModificationEntry & { installedAt: Date } => modification.installedAt !== null)
    .sort((a, b) => a.installedAt.getTime() - b.installedAt.getTime());

const formatLapTooltip = (params: echarts.TooltipComponentFormatterCallbackParams): string => {
  const items = Array.isArray(params) ? params : [params];

  return items
    .map((item) => {
      const value = Array.isArray(item.value) ? item.value[1] : item.value;
      if (typeof value !== 'number') return null;
      return `${item.marker ?? ''}${item.seriesName}: ${formatLapSeconds(value)}`;
    })
    .filter((line): line is string => line !== null)
    .join('<br/>');
};

export const BuildJournal: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { darkMode } = useTheme();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircuit, setSelectedCircuit] = useState('all');

  useEffect(() => {
    if (!currentUser || !id) return;

    let cancelled = false;
    const fetchJournal = async () => {
      try {
        setLoading(true);
        const [vehicleData, setups] = await Promise.all([
          getVehicle(id),
          getUserSetups(currentUser.uid, 500),
        ]);

        if (cancelled) return;

        if (!vehicleData || vehicleData.userId !== currentUser.uid) {
          setVehicle(null);
          setSessions([]);
          message.error('車両が見つかりません');
          return;
        }

        setVehicle(vehicleData);
        setSessions(toJournalSessions(setups, vehicleData));
      } catch (_error) {
        if (!cancelled) {
          message.error('ビルドジャーナルの読み込みに失敗しました');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchJournal();
    return () => {
      cancelled = true;
    };
  }, [currentUser, id]);

  const modifications = useMemo(
    () => vehicle?.profile?.modifications ?? [],
    [vehicle?.profile?.modifications],
  );
  const datedModifications = useMemo(() => sortedDatedModifications(modifications), [modifications]);
  const undatedModifications = useMemo(
    () => modifications.filter((modification) => modification.installedAt === null),
    [modifications],
  );
  const timeline = useMemo(() => buildJournalTimeline(modifications, sessions), [modifications, sessions]);
  const impacts = useMemo(() => computeModImpacts(modifications, sessions), [modifications, sessions]);
  const sessionsWithLap = useMemo(
    () => sessions.filter((session) => session.bestLapSeconds !== null),
    [sessions],
  );
  const circuits = useMemo(
    () => Array.from(new Set(sessionsWithLap.map((session) => session.circuit))).sort((a, b) => a.localeCompare(b, 'ja')),
    [sessionsWithLap],
  );

  useEffect(() => {
    if (selectedCircuit !== 'all' && !circuits.includes(selectedCircuit)) {
      setSelectedCircuit('all');
    }
  }, [circuits, selectedCircuit]);

  const lapTrendOption = useMemo<echarts.EChartsOption | null>(() => {
    if (sessionsWithLap.length === 0 || circuits.length === 0) return null;

    const visibleCircuits = selectedCircuit === 'all'
      ? circuits
      : circuits.filter((circuit) => circuit === selectedCircuit);
    const axisColor = darkMode ? '#9ca3af' : '#6b7280';
    const splitColor = darkMode ? '#1f2937' : '#e5e7eb';

    const series: echarts.SeriesOption[] = visibleCircuits.map((circuit, index) => ({
      name: circuit,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: sessionsWithLap
        .filter((session) => session.circuit === circuit)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((session) => [session.date.getTime(), session.bestLapSeconds] as [number, number]),
      lineStyle: { width: 2.4, color: CHART_COLORS[index % CHART_COLORS.length] },
      itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
    }));

    if (datedModifications.length > 0) {
      series.push({
        name: '改造イベント',
        type: 'line',
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          label: {
            show: true,
            position: 'insideEndTop',
            color: darkMode ? '#fed7aa' : '#9a3412',
            fontSize: 10,
            formatter: (params: echarts.DefaultLabelFormatterCallbackParams) => String(params.name ?? ''),
          },
          lineStyle: { color: '#f97316', type: 'dashed', width: 1.2, opacity: 0.7 },
          data: datedModifications.map((modification) => ({
            name: modification.partName,
            xAxis: modification.installedAt.getTime(),
          })),
        },
      });
    }

    return {
      backgroundColor: 'transparent',
      animation: false,
      color: CHART_COLORS,
      tooltip: {
        trigger: 'axis',
        formatter: formatLapTooltip,
      },
      legend: {
        bottom: 0,
        textStyle: { color: axisColor, fontSize: 11 },
      },
      grid: { left: 56, right: 18, top: 24, bottom: 48 },
      xAxis: {
        type: 'time',
        axisLabel: {
          color: axisColor,
          fontSize: 10,
          formatter: '{yyyy}/{MM}/{dd}',
        },
        axisLine: { lineStyle: { color: splitColor } },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        name: 'ベストラップ',
        nameTextStyle: { color: axisColor, fontSize: 11 },
        axisLabel: {
          color: axisColor,
          fontSize: 10,
          formatter: (value: number) => formatLapSeconds(value),
        },
        splitLine: { lineStyle: { color: splitColor } },
      },
      series,
    };
  }, [circuits, darkMode, datedModifications, selectedCircuit, sessionsWithLap]);

  const modLevel = vehicle?.profile ? estimateModLevel(vehicle.profile.modifications) : 'NORMAL';
  const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model}` : '';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Spin size="large" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <Header
          settingsModal={settingsModal}
          setSettingsModal={setSettingsModal}
          currentSettingView={currentSettingView}
          setCurrentSettingView={setCurrentSettingView}
        />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <Empty description={<span className="text-slate-500 dark:text-slate-400">車両が見つかりません</span>}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')}>
              車両管理へ戻る
            </Button>
          </Empty>
        </main>
      </div>
    );
  }

  const cardClass = 'rounded-md border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900';
  const sectionTitleClass = 'text-sm font-black tracking-normal text-slate-900 dark:text-slate-100';
  const mutedTextClass = 'text-sm text-slate-500 dark:text-slate-400';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-5 lg:px-6">
        <section className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/vehicles')}
                className="mb-3 -ml-2 text-slate-600 dark:text-slate-300"
              >
                車両管理へ戻る
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <CarOutlined />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                    {vehicleName}
                  </h2>
                  <p className={mutedTextClass}>
                    {vehicle.year}年式{vehicle.grade ? ` / ${vehicle.grade}` : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <ToolOutlined />
                {MOD_LEVEL_LABELS[modLevel]}
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                改造 {modifications.length}件
              </span>
            </div>
          </div>
        </section>

        <section className={`${cardClass} p-4 sm:p-5`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className={sectionTitleClass}>サーキット別ベストラップ推移</h3>
              <p className={mutedTextClass}>X軸は走行日、Y軸はベストラップ秒です。下に行くほど速い表示です。</p>
            </div>
            <Select
              value={selectedCircuit}
              onChange={setSelectedCircuit}
              className="w-full sm:w-60"
              options={[
                { value: 'all', label: 'すべてのサーキット' },
                ...circuits.map((circuit) => ({ value: circuit, label: circuit })),
              ]}
            />
          </div>
          {lapTrendOption ? (
            <EChart option={lapTrendOption} darkMode={darkMode} className="h-72 sm:h-96" />
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className={`${cardClass} p-4 sm:p-5`}>
            <h3 className={sectionTitleClass}>タイムライン</h3>
            <div className="mt-4">
              {timeline.length > 0 ? (
                <Timeline events={timeline} />
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${cardClass} p-4 sm:p-5`}>
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <WarningOutlined className="mt-0.5" />
                <span>{ROI_NOTE}</span>
              </div>
              <h3 className={sectionTitleClass}>Mod ROI注釈</h3>
              <div className="mt-4 space-y-3">
                {impacts.length > 0 ? (
                  impacts.map((impact) => (
                    <ImpactCard
                      key={`${impact.modificationId}-${impact.circuit}`}
                      impact={impact}
                      modification={modifications.find((modification) => modification.id === impact.modificationId)}
                    />
                  ))
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>

            {undatedModifications.length > 0 && (
              <div className={`${cardClass} p-4 sm:p-5`}>
                <h3 className={sectionTitleClass}>日付未設定の改造</h3>
                <div className="mt-3 space-y-2">
                  {undatedModifications.map((modification) => (
                    <ModificationRow key={modification.id} modification={modification} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950">
    <p className="text-sm text-slate-500 dark:text-slate-400">
      改造の装着日とラップタイム付きの走行記録が揃うと、ここに変化が表示されます
    </p>
  </div>
);

const Timeline: React.FC<{ events: JournalEvent[] }> = ({ events }) => (
  <div className="relative space-y-3">
    <div className="absolute bottom-0 left-4 top-0 w-px bg-slate-200 dark:bg-slate-800" />
    {events.map((event) => (
      <div key={eventKey(event)} className="relative flex gap-3 pl-1">
        <div className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {event.kind === 'mod' ? <ToolOutlined /> : <FieldTimeOutlined />}
        </div>
        <div className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          {event.kind === 'mod' ? (
            <ModificationEvent event={event} />
          ) : (
            <SessionEvent event={event} />
          )}
        </div>
      </div>
    ))}
  </div>
);

const eventKey = (event: JournalEvent): string =>
  event.kind === 'mod'
    ? `mod-${event.modification.id}`
    : `session-${event.session.setupId}-${event.date.getTime()}`;

const ModificationEvent: React.FC<{ event: Extract<JournalEvent, { kind: 'mod' }> }> = ({ event }) => (
  <div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1">
        <CalendarOutlined />
        {formatDate(event.date)}
      </span>
      <span className="rounded bg-orange-100 px-2 py-0.5 font-bold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
        {MOD_CATEGORY_LABELS[event.modification.category]}
      </span>
    </div>
    <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{event.modification.partName}</div>
    {event.modification.maker && (
      <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{event.modification.maker}</div>
    )}
  </div>
);

const SessionEvent: React.FC<{ event: Extract<JournalEvent, { kind: 'session' }> }> = ({ event }) => (
  <div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1">
        <CalendarOutlined />
        {formatDate(event.date)}
      </span>
      <span className="inline-flex items-center gap-1">
        <EnvironmentOutlined />
        {event.session.circuit}
      </span>
      {event.isCircuitBest && (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <TrophyOutlined />
          ベスト更新
        </span>
      )}
    </div>
    <div className="mt-1 font-mono text-lg font-black tabular-nums text-slate-900 dark:text-slate-100">
      {event.session.bestLapSeconds !== null ? formatLapSeconds(event.session.bestLapSeconds) : 'ベストラップ未入力'}
    </div>
  </div>
);

const ImpactCard: React.FC<{
  impact: ModImpact;
  modification: ModificationEntry | undefined;
}> = ({ impact, modification }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-bold text-slate-900 dark:text-slate-100">
      <span>{modification?.partName ?? '改造'} 導入後、{impact.circuit}:</span>
      <span className="font-mono text-base font-black tabular-nums text-slate-900 dark:text-slate-100">
        {formatLapSeconds(impact.beforeBestSeconds)}
      </span>
      <span className="text-slate-400">→</span>
      <span className="font-mono text-base font-black tabular-nums text-slate-900 dark:text-slate-100">
        {formatLapSeconds(impact.afterBestSeconds)}
      </span>
      <span className="text-slate-500 dark:text-slate-400">（</span>
      <span className={`font-mono text-sm font-black tabular-nums ${impact.deltaSeconds < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {formatSignedSeconds(impact.deltaSeconds)}秒
      </span>
      <span className="text-slate-500 dark:text-slate-400">）</span>
    </div>
    {impact.yenPerSecond !== null && (
      <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <DollarOutlined />
        約{formatYen(impact.yenPerSecond)}/秒
      </div>
    )}
  </div>
);

const ModificationRow: React.FC<{ modification: ModificationEntry }> = ({ modification }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="rounded bg-slate-200 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {MOD_CATEGORY_LABELS[modification.category]}
      </span>
      {modification.costJPY !== null && <span>{formatYen(modification.costJPY)}</span>}
    </div>
    <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{modification.partName}</div>
    {modification.maker && (
      <div className="text-sm text-slate-500 dark:text-slate-400">{modification.maker}</div>
    )}
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
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [option, darkMode]);

  return <div ref={ref} className={`w-full ${className}`} />;
};
