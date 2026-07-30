// フィーリングの記録（コーナー区分つき）
//
// 「アンダー／オーバー」だけでは記録にならない。**どの速度域の、どの局面で**
// 出たのかがセットアップを動かす手がかりになるので、そこまで残す。
//
// ピットでの入力コストを抑えるため、9項目すべては聞かない:
//   1画面目「どこで気になった?」→ 3×3 のマス目から1つ
//   2画面目「どうだった?」→ 強アンダー〜強オーバーの5択
// 気になった箇所が複数あれば繰り返せる。何も無ければ「気にならなかった」で抜ける。
//
// 触っていない箇所は null のまま。「気にならなかった」を9項目 N で埋めない。
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SPEED_RANGES, CORNER_PHASES, allSpots, valueAt,
  type CornerSpot,
} from '../../lib/cornerFeedback';
import type { DrivingFeedback } from '../../types/setup';

interface Props {
  feedback: DrivingFeedback;
  onRate: (spot: CornerSpot, value: number) => void;
  /** 気にならなかった＝総合バランスをニュートラルとして残す */
  onNoIssue: () => void;
  onDone: () => void;
  onCancel: () => void;
  refined: boolean;
}

const BALANCE_KEYS = [
  'quickEntry.feeling.understeerStrong',
  'quickEntry.feeling.understeerMild',
  'quickEntry.feeling.neutral',
  'quickEntry.feeling.oversteerMild',
  'quickEntry.feeling.oversteerStrong',
];

export const CornerFeelingStep: React.FC<Props> = ({
  feedback, onRate, onNoIssue, onDone, onCancel, refined,
}) => {
  const { t } = useTranslation('setup');
  const [picked, setPicked] = useState<CornerSpot | null>(null);

  const text = refined ? 'text-[#f6f5e8]' : 'text-gray-900 dark:text-gray-50';
  const sub = refined ? 'text-[#a8a79b]' : 'text-gray-700 dark:text-gray-200';
  const cell = refined
    ? 'border-[#232733] bg-[#101218] text-[#f6f5e8]'
    : 'border-gray-700 bg-white text-gray-900 dark:border-gray-200 dark:bg-gray-700 dark:text-gray-50';
  const on = refined
    ? 'border-[#f6f5e8] bg-[#f6f5e8] text-[#0a0b10]'
    : 'border-blue-800 bg-blue-800 text-white';
  const rated = refined ? 'border-[#8fe0a4] text-[#8fe0a4]' : 'border-green-900 text-green-900 dark:border-green-300 dark:text-green-300';

  const ratedCount = allSpots().filter((s) => valueAt(feedback, s) !== null).length;

  // ── 2画面目: 選んだ箇所の方向を聞く ──
  if (picked) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="px-4 pt-2">
          <div className={`text-center text-lg font-bold ${text}`}>
            {t('quickEntry.feeling.directionTitle', {
              spot: `${t(`quickEntry.feeling.speed.${picked.speed}`)}・${t(`quickEntry.feeling.phase.${picked.phase}`)}`,
            })}
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2 px-3 pb-3">
          {BALANCE_KEYS.map((key, value) => (
            <button
              key={key}
              type="button"
              onClick={() => { onRate(picked, value); setPicked(null); }}
              className={`flex items-center justify-center rounded-xl border-2 text-lg font-bold ${cell}`}
              style={{ minHeight: 64 }}
            >
              {t(key)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicked(null)}
            className={`flex items-center justify-center rounded-xl border-2 text-base font-bold ${cell}`}
            style={{ minHeight: 64 }}
          >
            {t('quickEntry.feeling.back')}
          </button>
        </div>
      </div>
    );
  }

  // ── 1画面目: どこで気になったか ──
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-2">
        <div className={`text-center text-lg font-bold ${text}`}>{t('quickEntry.feeling.whereTitle')}</div>
        <div className={`mt-1 text-center text-base font-semibold ${sub}`}>
          {ratedCount > 0
            ? t('quickEntry.feeling.ratedCount', { count: ratedCount })
            : t('quickEntry.feeling.whereHint')}
        </div>
      </div>

      <div className="mt-auto px-3 pb-3">
        {/* 列見出し: 進入 / 中間 / 立ち上がり */}
        <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1">
          <div />
          {CORNER_PHASES.map((p) => (
            <div key={p} className={`pb-1 text-center text-xs font-bold ${sub}`}>
              {t(`quickEntry.feeling.phase.${p}`)}
            </div>
          ))}

          {SPEED_RANGES.map((speed) => (
            <React.Fragment key={speed}>
              <div className={`flex items-center pr-1 text-xs font-bold ${sub}`} style={{ minWidth: 34 }}>
                {t(`quickEntry.feeling.speed.${speed}`)}
              </div>
              {CORNER_PHASES.map((phase) => {
                const v = valueAt(feedback, { speed, phase });
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setPicked({ speed, phase })}
                    aria-label={`${t(`quickEntry.feeling.speed.${speed}`)} ${t(`quickEntry.feeling.phase.${phase}`)}`}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 text-sm font-bold ${
                      v !== null ? `${cell} ${rated}` : cell
                    }`}
                    style={{ minHeight: 64 }}
                  >
                    {v !== null ? t(`quickEntry.feeling.shortBalance.${v}`) : '—'}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={ratedCount > 0 ? onDone : onNoIssue}
            className={`flex items-center justify-center rounded-xl border-2 text-base font-bold ${on}`}
            style={{ minHeight: 64 }}
          >
            {ratedCount > 0 ? t('quickEntry.feeling.finish') : t('quickEntry.feeling.noIssue')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`flex items-center justify-center rounded-xl border-2 text-base font-bold ${cell}`}
            style={{ minHeight: 64 }}
          >
            {t('quickEntry.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
