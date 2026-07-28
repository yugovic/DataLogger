// タイヤ空気圧を「車の俯瞰図の上で」入力するシーン（QuickEntryModal から使用）
//
// 車両俯瞰図の四隅に FL/FR/RL/RR のホイールを配置し、アクティブ輪を強調表示する。
// 入力すると自動で次の未入力輪へ進む。冷間(before)/温間(after) はトグルで切替。
// 未測定の輪は null のまま（0埋め・デモ値は禁止 — データ品質方針）。
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StepNumber } from '../common/StepNumber';
import { calcPressureAdvice, getWheelTarget } from '../../lib/pressureAdvice';
import {
  WHEEL_ORDER,
  nextEmptyWheel,
  firstEmptyWheel,
  initialTireMode,
  type WheelKey,
} from '../../lib/quickEntryFlow';

export interface TirePressureSceneHandle {
  /**
   * 「次のタイヤへ」操作。未入力輪が残っていればそこへ移動して false を返す。
   * 全輪入力済み（または全輪スキップ済み判断は呼び出し側）なら true を返し、
   * 呼び出し側は次の質問へ進んでよい。
   */
  advance: () => boolean;
}

interface TirePressureSceneProps {
  /** 冷間(走行前)の実測値。文字列（空文字=未入力）で保持している既存 state をそのまま渡す */
  cold: Record<WheelKey, string>;
  hot: Record<WheelKey, string>;
  onChangeCold: (wheel: WheelKey, raw: string) => void;
  onChangeHot: (wheel: WheelKey, raw: string) => void;
  targetPressures: { front: string; rear: string };
  disabled?: boolean;
}

const toNum = (v: string): number | null => {
  if (v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const WHEEL_LABEL: Record<WheelKey, string> = { fl: 'FL', fr: 'FR', rl: 'RL', rr: 'RR' };
const WHEEL_POS: Record<WheelKey, string> = {
  fl: 'left-0 top-[8%]',
  fr: 'right-0 top-[8%]',
  rl: 'left-0 bottom-[8%]',
  rr: 'right-0 bottom-[8%]',
};

export const TirePressureScene = forwardRef<TirePressureSceneHandle, TirePressureSceneProps>(
  ({ cold, hot, onChangeCold, onChangeHot, targetPressures, disabled }, ref) => {
    const { t } = useTranslation('setup');

    const coldNum = useMemo(
      () => ({ fl: toNum(cold.fl), fr: toNum(cold.fr), rl: toNum(cold.rl), rr: toNum(cold.rr) }),
      [cold],
    );
    const hotNum = useMemo(
      () => ({ fl: toNum(hot.fl), fr: toNum(hot.fr), rl: toNum(hot.rl), rr: toNum(hot.rr) }),
      [hot],
    );

    const [mode, setMode] = useState<'cold' | 'hot'>(() => initialTireMode(coldNum));
    const [active, setActive] = useState<WheelKey>(() => {
      const vals = mode === 'cold' ? coldNum : hotNum;
      return firstEmptyWheel(vals) ?? 'fl';
    });

    const currentVals = mode === 'cold' ? coldNum : hotNum;
    const setValue = mode === 'cold' ? onChangeCold : onChangeHot;

    const front = targetPressures.front !== '' ? parseFloat(targetPressures.front) : null;
    const rear = targetPressures.rear !== '' ? parseFloat(targetPressures.rear) : null;
    const targetOf = (w: WheelKey) => getWheelTarget(w, front, rear);

    useImperativeHandle(ref, () => ({
      advance: () => {
        const next = nextEmptyWheel(currentVals, active);
        if (next) {
          setActive(next);
          return false;
        }
        return true;
      },
    }));

    const handleWheelChange = (wheel: WheelKey, n: number | null) => {
      setValue(wheel, n === null ? '' : String(n));
      if (n !== null) {
        const nextVals = { ...currentVals, [wheel]: n };
        const next = nextEmptyWheel(nextVals, wheel);
        if (next) setActive(next);
      }
    };

    const activeTarget = targetOf(active);
    const activeAdvice = calcPressureAdvice(currentVals[active], activeTarget);

    return (
      <div className="flex flex-1 flex-col px-3 pt-1 min-h-0">
        <div className="mb-1 text-center text-xs text-gray-500 dark:text-gray-400">
          {t('quickEntry.tire.subtitle')}
        </div>
        <div className="mb-2 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setMode('cold')}
            className={`rounded-full border px-3 py-1 text-xs ${
              mode === 'cold'
                ? 'border-blue-400 bg-blue-50 font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
            }`}
          >
            {t('quickEntry.tire.cold')}
          </button>
          <button
            type="button"
            onClick={() => setMode('hot')}
            className={`rounded-full border px-3 py-1 text-xs ${
              mode === 'hot'
                ? 'border-blue-400 bg-blue-50 font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
            }`}
          >
            {t('quickEntry.tire.hot')}
          </button>
        </div>

        <div className="relative mx-auto mt-1 w-[220px] flex-1" style={{ maxHeight: 260 }}>
          <div className="absolute left-1/2 top-[6%] h-[88%] w-[104px] -translate-x-1/2 rounded-[48px_48px_40px_40px] border-2 border-gray-300 bg-gradient-to-b from-gray-100 to-transparent dark:border-gray-600 dark:from-gray-700" />
          <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] tracking-widest text-gray-400">
            FRONT
          </span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-gray-400">
            REAR
          </span>
          {WHEEL_ORDER.map((w) => {
            const v = currentVals[w];
            const advice = calcPressureAdvice(v, targetOf(w));
            const valueColor =
              v == null
                ? 'text-gray-400 dark:text-gray-500'
                : advice.status === 'green'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-orange-500 dark:text-orange-400';
            const isActive = active === w;
            const isDone = v != null;
            let diffLabel: string | null = null;
            if (mode === 'hot' && coldNum[w] != null && v != null) {
              const d = v - (coldNum[w] as number);
              const sign = d >= 0 ? '+' : '';
              const vsColdLabel = t('quickEntry.tire.vsCold');
              diffLabel = `${sign}${d} ${vsColdLabel}`;
            }
            return (
              <button
                type="button"
                key={w}
                onClick={() => setActive(w)}
                className={`absolute flex h-14 w-[72px] flex-col items-center justify-center rounded-xl border-2 bg-white text-center transition-colors dark:bg-gray-800 ${WHEEL_POS[w]} ${
                  isActive
                    ? 'border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(24,144,255,0.15)] dark:bg-blue-900/30'
                    : isDone
                      ? 'border-green-400'
                      : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <span className="text-[10px] font-semibold tracking-wide text-gray-400">
                  {WHEEL_LABEL[w]}
                </span>
                <span className={`text-base font-bold tabular-nums ${valueColor}`}>
                  {v == null ? '—' : (
                    <>
                      {v}
                      <small className="ml-0.5 text-[10px] font-normal text-gray-400">kPa</small>
                    </>
                  )}
                </span>
                {diffLabel && <span className="text-[10px] text-gray-400">{diffLabel}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-col items-center gap-1 pb-1">
          <StepNumber
            value={currentVals[active]}
            onChange={(n) => handleWheelChange(active, n)}
            min={50}
            max={400}
            step={1}
            largeStep={5}
            size="large"
            inputWidth={90}
            unit="kPa"
            disabled={disabled}
            defaultValue={activeTarget ?? 200}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('quickEntry.tire.target', { lo: activeTarget != null ? activeTarget - 5 : '—', hi: activeTarget != null ? activeTarget + 5 : '—' })}
            {currentVals[active] != null && (
              <>
                {' '}·{' '}
                <b className={activeAdvice.status === 'green' ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}>
                  {activeAdvice.status === 'green' ? t('quickEntry.tire.inRange') : t('quickEntry.tire.outOfRange')}
                </b>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);

TirePressureScene.displayName = 'TirePressureScene';
