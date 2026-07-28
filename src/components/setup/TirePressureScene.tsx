// タイヤ空気圧を4輪ぶん連続入力するシーン（QuickEntryModal から使用）
//
// 画面構成は「グローブ・直射日光・片手親指」から逆算している:
// - 上部（y<281px 相当）には読むだけの表示しか置かない
// - 触るもの（4輪の選択・テンキー）はすべて下側の親指到達域に置く
// - 入力は OS キーボードでなく大型テンキー。1輪=3タップで確定し、自動で次の輪へ進む
// - 文字色は対背景 7:1 以上のものだけを使う（gray-400/500 は使わない）
//
// 未測定の輪は null のまま（0埋め・デモ値は禁止 — データ品質方針）。
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PitKeypad, PIT_COLORS } from './PitKeypad';
import { calcPressureAdvice, getWheelTarget } from '../../lib/pressureAdvice';
import { appendDigit, backspace, pressureDigitsToValue } from '../../lib/pitKeypadInput';
import {
  WHEEL_ORDER,
  nextEmptyWheel,
  firstEmptyWheel,
  initialTireMode,
  type WheelKey,
} from '../../lib/quickEntryFlow';

export interface TirePressureSceneHandle {
  /** 未入力輪が残っていれば移動して false、全輪終わっていれば true */
  advance: () => boolean;
}

interface TirePressureSceneProps {
  cold: Record<WheelKey, string>;
  hot: Record<WheelKey, string>;
  onChangeCold: (wheel: WheelKey, raw: string) => void;
  onChangeHot: (wheel: WheelKey, raw: string) => void;
  targetPressures: { front: string; rear: string };
  /** 全輪の入力が終わったときに呼ぶ（次の質問へ進む） */
  onDone: () => void;
  /** 連続入力そのものを中断する */
  onCancel: () => void;
  /** 前回同一条件の温間空気圧。あれば初期値として提示する（引き継ぎであることを明示する） */
  carriedOver?: Record<WheelKey, number | null> | null;
}

const toNum = (v: string): number | null => {
  if (v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const WHEEL_LABEL: Record<WheelKey, string> = { fl: 'FL', fr: 'FR', rl: 'RL', rr: 'RR' };
const WHEEL_POS: Record<WheelKey, string> = {
  fl: 'left-0 top-0',
  fr: 'right-0 top-0',
  rl: 'left-0 bottom-0',
  rr: 'right-0 bottom-0',
};

export const TirePressureScene = forwardRef<TirePressureSceneHandle, TirePressureSceneProps>(
  ({ cold, hot, onChangeCold, onChangeHot, targetPressures, onDone, onCancel, carriedOver }, ref) => {
    const { t } = useTranslation('setup');

    const coldNum = useMemo(
      () => ({ fl: toNum(cold.fl), fr: toNum(cold.fr), rl: toNum(cold.rl), rr: toNum(cold.rr) }),
      [cold],
    );
    const hotNum = useMemo(
      () => ({ fl: toNum(hot.fl), fr: toNum(hot.fr), rl: toNum(hot.rl), rr: toNum(hot.rr) }),
      [hot],
    );

    // 走行直後のピットで記録するのは温間。冷間が未入力のときだけ冷間から聞く。
    const [mode] = useState<'cold' | 'hot'>(() => initialTireMode(coldNum));
    const [active, setActive] = useState<WheelKey>(() => {
      const vals = mode === 'cold' ? coldNum : hotNum;
      return firstEmptyWheel(vals) ?? 'fl';
    });
    /** テンキーで打っている途中の数字列。輪を変えるたびに空に戻す */
    const [digits, setDigits] = useState('');

    const currentVals = mode === 'cold' ? coldNum : hotNum;
    const setValue = mode === 'cold' ? onChangeCold : onChangeHot;

    const front = targetPressures.front !== '' ? parseFloat(targetPressures.front) : null;
    const rear = targetPressures.rear !== '' ? parseFloat(targetPressures.rear) : null;
    const targetOf = (w: WheelKey) => getWheelTarget(w, front, rear);

    const goToWheel = (w: WheelKey) => {
      setActive(w);
      setDigits('');
    };

    useImperativeHandle(ref, () => ({
      advance: () => {
        const next = nextEmptyWheel(currentVals, active);
        if (next) {
          goToWheel(next);
          return false;
        }
        return true;
      },
    }));

    /** 打ち込み中の値。未確定なら数字列を、確定済みなら保存値を表示する */
    const pendingValue = digits === '' ? currentVals[active] : pressureDigitsToValue(digits);
    const displayText = digits !== '' ? digits : currentVals[active] == null ? '—' : String(currentVals[active]);
    const activeTarget = targetOf(active);
    const advice = calcPressureAdvice(pendingValue, activeTarget);
    const canCommit = pendingValue != null;

    /** 現在の輪を確定し、次の未入力輪へ。残っていなければ次の質問へ */
    const commit = () => {
      if (pendingValue == null) return;
      setValue(active, String(pendingValue));
      const nextVals = { ...currentVals, [active]: pendingValue };
      const next = nextEmptyWheel(nextVals, active);
      if (next) {
        goToWheel(next);
      } else {
        setDigits('');
        onDone();
      }
    };

    /** 前回値をこの輪の初期値として入れる（引き継ぎ。実測でないことは画面に出す） */
    const applyCarriedOver = () => {
      const v = carriedOver?.[active];
      if (v != null) setDigits(String(v));
    };

    const carriedForActive = carriedOver?.[active] ?? null;

    return (
      <div className="flex flex-1 flex-col">
        {/* ── 表示帯（触らない）: いま何を入れているかと、その値 ── */}
        <div className="px-4 pt-2">
          <div className={`text-center text-lg font-bold ${PIT_COLORS.text}`}>
            {t('quickEntry.tire.askWheel', {
              wheel: WHEEL_LABEL[active],
              mode: mode === 'cold' ? t('quickEntry.tire.cold') : t('quickEntry.tire.hot'),
            })}
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span
              className={`text-6xl font-black tabular-nums ${
                pendingValue == null
                  ? PIT_COLORS.sub
                  : advice.status === 'green'
                    ? PIT_COLORS.ok
                    : PIT_COLORS.warn
              }`}
            >
              {displayText}
            </span>
            <span className={`text-xl font-bold ${PIT_COLORS.sub}`}>kPa</span>
          </div>
          <div className={`mt-1 text-center text-base font-semibold ${PIT_COLORS.sub}`}>
            {activeTarget != null
              ? t('quickEntry.tire.target', { lo: activeTarget - 5, hi: activeTarget + 5 })
              : t('quickEntry.tire.noTarget')}
            {pendingValue != null && activeTarget != null && (
              <>
                {' · '}
                <b className={advice.status === 'green' ? PIT_COLORS.ok : PIT_COLORS.warn}>
                  {advice.status === 'green'
                    ? t('quickEntry.tire.inRange')
                    : t('quickEntry.tire.outOfRange')}
                </b>
              </>
            )}
          </div>
          {carriedForActive != null && digits === '' && currentVals[active] == null && (
            <button
              type="button"
              onClick={applyCarriedOver}
              className="mx-auto mt-2 block rounded-lg border-2 border-blue-800 px-4 text-base font-bold text-blue-800 dark:border-blue-300 dark:text-blue-300"
              style={{ minHeight: 60 }}
            >
              {t('quickEntry.tire.useCarriedOver', { value: carriedForActive })}
            </button>
          )}
        </div>

        {/* ── 4輪図（触れる・親指到達域）: 入力済みの確認と、直したい輪への移動 ── */}
        <div className="relative mx-auto my-2 w-[248px]" style={{ height: 188 }}>
          <div className="absolute left-1/2 top-2 h-[172px] w-[92px] -translate-x-1/2 rounded-[40px_40px_32px_32px] border-2 border-gray-500 dark:border-gray-400" />
          {WHEEL_ORDER.map((w) => {
            const v = currentVals[w];
            const wAdvice = calcPressureAdvice(v, targetOf(w));
            const isActive = active === w;
            return (
              <button
                type="button"
                key={w}
                onClick={() => goToWheel(w)}
                className={`absolute flex flex-col items-center justify-center rounded-xl border-2 bg-white dark:bg-gray-700 ${WHEEL_POS[w]} ${
                  isActive
                    ? 'border-blue-800 ring-4 ring-blue-300 dark:border-blue-300'
                    : 'border-gray-500 dark:border-gray-400'
                }`}
                style={{ width: 76, height: 76 }}
              >
                <span className={`text-sm font-black ${PIT_COLORS.sub}`}>{WHEEL_LABEL[w]}</span>
                <span
                  className={`text-2xl font-black tabular-nums ${
                    v == null
                      ? PIT_COLORS.sub
                      : wAdvice.status === 'green'
                        ? PIT_COLORS.ok
                        : PIT_COLORS.warn
                  }`}
                >
                  {v == null ? '—' : v}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── テンキー（親指到達域）── */}
        <div className="mt-auto">
          <PitKeypad
            onDigit={(d) => setDigits((prev) => appendDigit(prev, d, 3))}
            onBackspace={() => setDigits((prev) => backspace(prev))}
            onCommit={commit}
            commitEnabled={canCommit}
            commitLabel={t('quickEntry.tire.commitWheel', { wheel: WHEEL_LABEL[active] })}
            onCancel={onCancel}
            cancelLabel={t('quickEntry.cancel')}
          />
        </div>
      </div>
    );
  },
);

TirePressureScene.displayName = 'TirePressureScene';
