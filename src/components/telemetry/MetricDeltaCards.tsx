// 指標デルタカード（段階A・§4.6）
// A の値と B の差分（符号色）を並べる。導出できない指標（null）は出さない。
// 「14m手前でブレーキ」のように、生トレースを非専門家でも読める数値へ蒸留する軽い解釈層。

import React from 'react';
import type { LapMetrics } from '../../lib/telemetry';

interface MetricDeltaCardsProps {
  metricsA: LapMetrics;
  metricsB: LapMetrics;
}

/** 差分の向きの良し悪し: 'higher' = 値が大きいほど良い / 'lower' = 小さいほど良い */
type Better = 'higher' | 'lower' | 'neutral';

interface MetricSpec {
  label: string;
  unit: string;
  /** A 値の取得（null なら指標自体を出さない） */
  a: number | null;
  /** B 値の取得 */
  b: number | null;
  /** 表示桁 */
  digits: number;
  /** B−A の符号色の意味づけ */
  better: Better;
}

const fmt = (v: number | null, digits: number, unit: string): string =>
  v === null ? '—' : `${v.toFixed(digits)}${unit}`;

const fmtDelta = (delta: number, digits: number, unit: string): string => {
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${Math.abs(delta).toFixed(digits)}${unit}`;
};

/** B−A の差分が「良い方向」かで色を決める */
function deltaColor(delta: number, better: Better): string {
  if (better === 'neutral' || Math.abs(delta) < 1e-9) return 'text-gray-400 dark:text-gray-500';
  const good = better === 'higher' ? delta > 0 : delta < 0;
  return good ? 'text-emerald-500' : 'text-red-500';
}

export const MetricDeltaCards: React.FC<MetricDeltaCardsProps> = ({ metricsA, metricsB }) => {
  const specs: MetricSpec[] = [
    {
      label: 'ラップタイム',
      unit: 's',
      a: metricsA.lapTimeSeconds,
      b: metricsB.lapTimeSeconds,
      digits: 3,
      better: 'lower',
    },
    {
      label: '最高速',
      unit: ' km/h',
      a: metricsA.topSpeedKmh,
      b: metricsB.topSpeedKmh,
      digits: 1,
      better: 'higher',
    },
    {
      label: '最小コーナー速度',
      unit: ' km/h',
      a: metricsA.minCornerSpeedKmh,
      b: metricsB.minCornerSpeedKmh,
      digits: 1,
      better: 'higher',
    },
    {
      label: 'ブレーキ開始',
      unit: ' m',
      a: metricsA.brakingPointM,
      b: metricsB.brakingPointM,
      digits: 0,
      better: 'higher', // 奥まで踏める（距離が大きい）方が良い
    },
    {
      label: '最大減速G',
      unit: ' G',
      a: metricsA.maxBrakingG,
      b: metricsB.maxBrakingG,
      digits: 2,
      better: 'lower', // より負＝強い制動
    },
    {
      label: '最大横G',
      unit: ' G',
      a: metricsA.maxLatG,
      b: metricsB.maxLatG,
      digits: 2,
      better: 'higher',
    },
    {
      label: '平均G',
      unit: ' G',
      a: metricsA.avgAbsLongG,
      b: metricsB.avgAbsLongG,
      digits: 2,
      better: 'neutral',
    },
  ];

  // フルスロットル% はスロットルCHがある時だけ（現状 null → 非表示）
  if (metricsA.fullThrottlePct !== null && metricsB.fullThrottlePct !== null) {
    specs.push({
      label: 'フルスロットル',
      unit: ' %',
      a: metricsA.fullThrottlePct,
      b: metricsB.fullThrottlePct,
      digits: 0,
      better: 'higher',
    });
  }

  // A・B 両方が出せる指標のみ表示（捏造・片側欠損での比較を避ける）
  const visible = specs.filter((s) => s.a !== null && s.b !== null);
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
      {visible.map((s) => {
        const delta = (s.b as number) - (s.a as number);
        return (
          <div
            key={s.label}
            className="rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2.5"
          >
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{s.label}</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              {/* A 値（基準） */}
              <span className="font-mono tabular-nums text-sm font-semibold text-blue-600 dark:text-blue-400">
                {fmt(s.a, s.digits, s.unit)}
              </span>
            </div>
            {/* B 差分（符号色） */}
            <div
              className={`mt-1 font-mono tabular-nums text-xs font-bold ${deltaColor(delta, s.better)}`}
            >
              {fmtDelta(delta, s.digits, s.unit)}
              <span className="ml-1 text-[10px] font-normal text-gray-400 dark:text-gray-500">B−A</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
