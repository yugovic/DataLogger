// 区間比較表（段階A・P1） — 累積距離を3等分した「区間1〜3」のA/B/差
// 公式セクターではないため見出しで「区間（3等分）」と明示する。

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LapProfile, SegmentDelta } from '../../lib/telemetry';
import { interpolateAt } from '../../lib/telemetry';

interface SegmentTableProps {
  segments: readonly SegmentDelta[];
  profileA: LapProfile;
  profileB: LapProfile;
}

/** profile の距離 d までの経過時間（s）。範囲外は端点 clamp */
function elapsedAt(profile: LapProfile, d: number): number | null {
  return interpolateAt({ distance: profile.distance, value: profile.elapsed }, d);
}

/** 区間 [from,to] の所要時間（s）= elapsed(to) − elapsed(from) */
function segTime(profile: LapProfile, from: number, to: number): number | null {
  const a = elapsedAt(profile, from);
  const b = elapsedAt(profile, to);
  if (a === null || b === null) return null;
  return b - a;
}

const fmt = (v: number | null): string => (v === null ? '—' : `${v.toFixed(3)}s`);
const fmtDelta = (v: number): string => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)}s`;

export const SegmentTable: React.FC<SegmentTableProps> = ({ segments, profileA, profileB }) => {
  const { t } = useTranslation();
  if (segments.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('telemetry.segment.title')}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {t('telemetry.segment.subtitle')}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
              <th className="text-left font-medium px-3 py-2">{t('telemetry.segment.columnSegment')}</th>
              <th className="text-right font-medium px-3 py-2 text-blue-600 dark:text-blue-400">A</th>
              <th className="text-right font-medium px-3 py-2 text-amber-600 dark:text-amber-400">B</th>
              <th className="text-right font-medium px-3 py-2">Δ B−A</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const ta = segTime(profileA, s.fromM, s.toM);
              const tb = segTime(profileB, s.fromM, s.toM);
              return (
                <tr
                  key={s.segment}
                  className="border-t border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-200"
                >
                  <td className="px-3 py-2">
                    <span className="font-medium">{t('telemetry.segment.segmentLabel', { n: s.segment })}</span>
                    <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                      {Math.round(s.fromM)}–{Math.round(s.toM)}m
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(ta)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(tb)}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums font-semibold ${
                      Math.abs(s.delta) < 1e-9
                        ? 'text-gray-400 dark:text-gray-500'
                        : s.delta < 0
                          ? 'text-emerald-500'
                          : 'text-red-500'
                    }`}
                  >
                    {fmtDelta(s.delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
