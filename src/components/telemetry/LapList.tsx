// ラップ一覧 — タイミングモニター風の表示（WP5）
// ベストラップはモータースポーツ慣習の「パープル」で強調し、
// OUT/IN（ライン通過で計測が完結していない周回）は減光して区別する。

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThunderboltFilled } from '@ant-design/icons';
import type { Lap } from '../../lib/telemetry';
import { formatLapDelta, formatLapSeconds } from './evidence';

/** 比較選択スロット（A=基準 / B=比較対象） */
export type LapSlot = 'A' | 'B';

interface LapListProps {
  laps: readonly Lap[];
  bestLapIndex: number | null;
  /** index 対応の最高速度（km/h）。null は非表示 */
  maxSpeeds?: readonly (number | null)[];
  /** 比較選択モード: laps の index → スロット。指定時は行がクリック可能になる */
  selection?: Partial<Record<LapSlot, number>>;
  onSelect?: (index: number) => void;
}

const SLOT_STYLES: Record<LapSlot, string> = {
  A: 'bg-blue-500 text-white',
  B: 'bg-amber-500 text-white',
};

export const LapList: React.FC<LapListProps> = ({
  laps,
  bestLapIndex,
  maxSpeeds,
  selection,
  onSelect,
}) => {
  const { t } = useTranslation();
  if (laps.length === 0) return null;

  const best = bestLapIndex !== null ? laps[bestLapIndex] : null;
  const selectable = onSelect !== undefined;
  const hasIncomplete = laps.some((l) => l.type !== 'NORMAL');

  const slotOf = (index: number): LapSlot | null => {
    if (selection?.A === index) return 'A';
    if (selection?.B === index) return 'B';
    return null;
  };

  return (
    <div>
      <div className="space-y-1.5">
        {laps.map((lap, index) => {
          const isBest = index === bestLapIndex;
          const isIncomplete = lap.type !== 'NORMAL';
          const slot = slotOf(index);
          const delta =
            best && lap.type === 'NORMAL' && !isBest
              ? formatLapDelta(lap.timeSeconds - best.timeSeconds)
              : null;
          const maxSpeed = maxSpeeds?.[index] ?? null;

          const rowClass = [
            'flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg border transition-colors',
            isBest
              ? 'bg-violet-500/10 border-violet-500/40'
              : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700/50',
            slot === 'A' ? 'ring-2 ring-blue-500' : '',
            slot === 'B' ? 'ring-2 ring-amber-500' : '',
            selectable ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500' : '',
          ].join(' ');

          return (
            <div
              key={`${lap.lapNumber}-${lap.startTime}`}
              className={rowClass}
              onClick={selectable ? () => onSelect(index) : undefined}
              role={selectable ? 'button' : undefined}
            >
              {/* ラップ番号 */}
              <span className="w-12 shrink-0 text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                LAP {lap.lapNumber}
              </span>

              {/* OUT/IN バッジ */}
              {isIncomplete && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gray-400/15 text-gray-500 dark:text-gray-400">
                  {lap.type}
                </span>
              )}

              {/* タイム */}
              <span
                className={`font-mono tabular-nums text-base sm:text-lg font-semibold ${
                  isBest
                    ? 'text-violet-600 dark:text-violet-300'
                    : isIncomplete
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-800 dark:text-gray-100'
                }`}
              >
                {formatLapSeconds(lap.timeSeconds)}
              </span>

              {/* BEST チップ */}
              {isBest && (
                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest bg-violet-500 text-white">
                  <ThunderboltFilled style={{ fontSize: 9 }} />
                  BEST
                </span>
              )}

              <span className="flex-1" />

              {/* ベスト比 */}
              {delta && (
                <span className="font-mono tabular-nums text-xs text-gray-400 dark:text-gray-500">
                  {delta}
                </span>
              )}

              {/* 最高速度 */}
              {maxSpeed !== null && (
                <span className="hidden sm:inline font-mono tabular-nums text-xs text-gray-500 dark:text-gray-400 w-24 text-right">
                  {maxSpeed.toFixed(1)} km/h
                </span>
              )}

              {/* 選択スロット表示 */}
              {selectable && (
                <span
                  className={`shrink-0 w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    slot
                      ? SLOT_STYLES[slot]
                      : 'bg-gray-200 dark:bg-gray-700 text-transparent'
                  }`}
                >
                  {slot ?? '·'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hasIncomplete && (
        <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
          {t('telemetry.lapList.incompleteNote')}
        </p>
      )}
    </div>
  );
};
