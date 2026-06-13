import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Empty, Select, Spin, Tag, message } from 'antd';
import {
  AreaChartOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Header } from '../common/Header';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTelemetryTraces } from '../../services/telemetryTraceService';
import type { TelemetryTrace, TelemetryTraceQualityFlags } from '../../types/telemetryTrace';
import { formatLapSeconds } from './evidence';
import logger from '../../utils/logger';

export const TelemetryTraceList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [traces, setTraces] = useState<TelemetryTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCircuit, setFilterCircuit] = useState<string | null>(null);
  const [filterCarModel, setFilterCarModel] = useState<string | null>(null);
  const [bestOnly, setBestOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const list = await getUserTelemetryTraces(currentUser.uid);
        setTraces(list);
      } catch (error) {
        logger.error('保存済みトレース一覧の取得に失敗しました:', error);
        message.error('保存済みトレース一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const bestTraceIdByBucket = useMemo(() => {
    const map = new Map<string, string>();
    traces.forEach((trace) => {
      if (!trace.id || !trace.lap.valid || trace.lap.type !== 'NORMAL') return;
      const key = bucketKey(trace);
      const existingId = map.get(key);
      const existing = traces.find((t) => t.id === existingId);
      if (!existing || trace.lap.timeSeconds < existing.lap.timeSeconds) {
        map.set(key, trace.id);
      }
    });
    return map;
  }, [traces]);

  const previousByTraceId = useMemo(() => {
    const map = new Map<string, TelemetryTrace>();
    const grouped = new Map<string, TelemetryTrace[]>();
    traces.forEach((trace) => {
      const key = bucketKey(trace);
      grouped.set(key, [...(grouped.get(key) ?? []), trace]);
    });
    grouped.forEach((items) => {
      const sorted = [...items].sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
      sorted.forEach((trace, index) => {
        if (trace.id && sorted[index + 1]) map.set(trace.id, sorted[index + 1]);
      });
    });
    return map;
  }, [traces]);

  const circuitOptions = useMemo(() => countOptions(traces.map((trace) => trace.circuit)), [traces]);
  const carOptions = useMemo(() => countOptions(traces.map((trace) => trace.carModel)), [traces]);

  const filteredTraces = useMemo(() => traces.filter((trace) => {
    if (filterCircuit && trace.circuit !== filterCircuit) return false;
    if (filterCarModel && trace.carModel !== filterCarModel) return false;
    if (bestOnly && trace.id !== bestTraceIdByBucket.get(bucketKey(trace))) return false;
    return true;
  }), [traces, filterCircuit, filterCarModel, bestOnly, bestTraceIdByBucket]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AreaChartOutlined className="text-xl text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">保存済みトレース</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ロガー取込で保存された比較用ラップを、車種・コース別の走行資産として確認します。
            </p>
          </div>
          <Button type="primary" onClick={() => navigate('/telemetry')}>
            新しいログを分析
          </Button>
        </div>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FilterOutlined className="text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">フィルター</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              value={filterCircuit}
              onChange={setFilterCircuit}
              placeholder="すべてのサーキット"
              allowClear
              showSearch
              options={circuitOptions}
            />
            <Select
              value={filterCarModel}
              onChange={setFilterCarModel}
              placeholder="すべての車種"
              allowClear
              showSearch
              options={carOptions}
            />
            <Button
              type={bestOnly ? 'primary' : 'default'}
              icon={<CheckCircleOutlined />}
              onClick={() => setBestOnly((value) => !value)}
            >
              自己ベストのみ
            </Button>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          </div>
        ) : filteredTraces.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  {traces.length === 0 ? '保存済みトレースがまだありません' : '条件に一致するトレースがありません'}
                </span>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTraces.map((trace) => {
              const isBest = trace.id === bestTraceIdByBucket.get(bucketKey(trace));
              const previous = trace.id ? previousByTraceId.get(trace.id) : undefined;
              const previousDelta = previous ? trace.lap.timeSeconds - previous.lap.timeSeconds : null;
              return (
                <TraceCard
                  key={trace.id}
                  trace={trace}
                  isBest={isBest}
                  previousDelta={previousDelta}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const TraceCard: React.FC<{
  trace: TelemetryTrace;
  isBest: boolean;
  previousDelta: number | null;
}> = ({ trace, isBest, previousDelta }) => (
  <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {isBest && <Tag color="green">自己ベスト</Tag>}
          <QualityTag flags={trace.qualityFlags} />
          <Tag>{trace.source.format}</Tag>
        </div>
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {formatLapSeconds(trace.lap.timeSeconds)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{trace.sessionDate.toLocaleDateString('ja-JP')}</span>
          <span>{trace.carModel}</span>
          <span className="inline-flex items-center gap-1">
            <EnvironmentOutlined />
            {trace.circuit}
          </span>
        </div>
        {previousDelta !== null && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            前回比:{' '}
            <span className={previousDelta <= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
              {previousDelta >= 0 ? '+' : '-'}{Math.abs(previousDelta).toFixed(3)}s
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {trace.id && (
          <>
            <Link
              to={`/telemetry/debrief?trace=${trace.id}`}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              デブリーフ
            </Link>
            <Link
              to={`/telemetry/compare?aTrace=${trace.id}`}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              比較
            </Link>
            <Link
              to={`/setup/${trace.setupId}`}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              記録
            </Link>
          </>
        )}
      </div>
    </div>
  </article>
);

const QualityTag: React.FC<{ flags: TelemetryTraceQualityFlags }> = ({ flags }) => {
  if (flags.gpsDropout || flags.lowSampleRate) return <Tag color="red" icon={<WarningOutlined />}>Limited</Tag>;
  if (flags.estimatedLine || flags.singleLapFile || flags.missingOperationChannels) {
    return <Tag color="gold" icon={<WarningOutlined />}>Usable</Tag>;
  }
  return <Tag color="green" icon={<CheckCircleOutlined />}>Verified</Tag>;
};

function bucketKey(trace: TelemetryTrace): string {
  return `${trace.carModel}__${trace.trackId ?? trace.circuit}`;
}

function countOptions(values: string[]): { value: string; label: string }[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: `${value} (${count})` }));
}

