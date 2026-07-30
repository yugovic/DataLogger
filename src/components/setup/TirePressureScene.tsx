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
import { PitKeypad } from './PitKeypad';
import { PIT } from '../../lib/pitTheme';
import { calcPressureAdvice, getWheelTarget } from '../../lib/pressureAdvice';
import { appendDigit, backspace, pressureDigitsToValue } from '../../lib/pitKeypadInput';
import {
  WHEEL_ORDER,
  nextEmptyWheel,
  firstEmptyWheel,
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

    // 走行直後の記録なので既定は温間。ただし冷間も入れられなければ記録として
    // 足りないので、取り違えが起きない大きさ（60px以上）の切替を置く。
    // 既定を冷間側に倒すと、計り取った温間の値を冷間として保存してしまうため、
    // 「空いている方に自動で合わせる」ことはしない。
    const [mode, setMode] = useState<'cold' | 'hot'>('hot');
    const [active, setActive] = useState<WheelKey>(() => firstEmptyWheel(hotNum) ?? 'fl');
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

    const carriedForActive = carriedOver?.[active] ?? null;

    /**
     * いま確定しようとしている値。
     * 打鍵中はその数字列、既に実測値があればそれ、どちらも無ければ前回値を「提案」として出す。
     * 提案は表示に「前回値」と明示し、確定ボタンにも前回値と書く。押さない限り保存されない
     * （黙って引き継いで実測値のふりをさせない）。
     */
    const isSuggestion = digits === '' && currentVals[active] == null && carriedForActive != null;
    const pendingValue = digits !== ''
      ? pressureDigitsToValue(digits)
      : currentVals[active] ?? carriedForActive;
    const displayText = digits !== ''
      ? digits
      : pendingValue == null ? '—' : String(pendingValue);
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

    return (
      <div className="flex flex-1 flex-col">
        {/* ── 表示帯（触らない）。ここを伸縮させることで、下の4輪図とテンキーを
            常に親指の到達域（390x844 で y>=281）へ押し下げる ── */}
        <div className="flex flex-1 flex-col justify-center px-4 pt-2" style={{ minHeight: 245 }}>
          <div className={`text-center text-lg font-bold ${PIT.text}`}>
            {t('quickEntry.tire.askWheel', {
              wheel: WHEEL_LABEL[active],
              mode: mode === 'cold' ? t('quickEntry.tire.cold') : t('quickEntry.tire.hot'),
            })}
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span
              className={`text-6xl font-black tabular-nums ${
                pendingValue == null
                  ? PIT.sub
                  : advice.status === 'green'
                    ? PIT.ok
                    : PIT.warn
              }`}
            >
              {displayText}
            </span>
            <span className={`text-xl font-bold ${PIT.sub}`}>kPa</span>
          </div>
          {isSuggestion && (
            <div className={`mt-1 text-center text-base font-bold ${PIT.accent}`}>
              {t('quickEntry.tire.carriedOverBadge')}
            </div>
          )}
          <div className={`mt-1 text-center text-base font-semibold ${PIT.sub}`}>
            {activeTarget != null
              ? t('quickEntry.tire.target', { lo: activeTarget - 5, hi: activeTarget + 5 })
              : t('quickEntry.tire.noTarget')}
            {pendingValue != null && activeTarget != null && (
              <>
                {' · '}
                <b className={advice.status === 'green' ? PIT.ok : PIT.warn}>
                  {advice.status === 'green'
                    ? t('quickEntry.tire.inRange')
                    : t('quickEntry.tire.outOfRange')}
                </b>
              </>
            )}
          </div>
        </div>

        {/* 冷間/温間の切替。取り違えると実測値の意味が変わるので、
            小さなタブではなく 60px 以上のボタン2つで明示的に選ばせる */}
        <div className="mx-auto mb-2 grid w-full max-w-[320px] shrink-0 grid-cols-2 gap-2 px-3">
          {(['cold', 'hot'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setDigits(''); }}
              aria-pressed={mode === m}
              className={`flex items-center justify-center rounded-xl border-2 text-base font-bold ${
                mode === m
                  ? 'border-blue-800 bg-blue-800 text-white'
                  : `${PIT.border} ${PIT.surface} ${PIT.text}`
              }`}
              style={{ minHeight: 60 }}
            >
              {t(m === 'cold' ? 'quickEntry.tire.cold' : 'quickEntry.tire.hot')}
            </button>
          ))}
        </div>

        {/* ── 4輪図（触れる・親指到達域）: 入力済みの確認と、直したい輪への移動 ── */}
        <div className="relative mx-auto my-2 w-[248px] shrink-0" style={{ height: 188 }}>
          <div className={`absolute left-1/2 top-2 h-[172px] w-[92px] -translate-x-1/2 rounded-[40px_40px_32px_32px] border-2 ${PIT.border}`} />
          {WHEEL_ORDER.map((w) => {
            const v = currentVals[w];
            const wAdvice = calcPressureAdvice(v, targetOf(w));
            const isActive = active === w;
            return (
              <button
                type="button"
                key={w}
                onClick={() => goToWheel(w)}
                className={`absolute flex flex-col items-center justify-center rounded-xl border-2 ${PIT.surface} ${WHEEL_POS[w]} ${
                  isActive
                    ? 'border-blue-800 ring-4 ring-blue-800 dark:border-blue-200 dark:ring-blue-200'
                    : PIT.border
                }`}
                style={{ width: 76, height: 76 }}
              >
                <span className={`text-sm font-black ${PIT.sub}`}>{WHEEL_LABEL[w]}</span>
                <span
                  className={`text-2xl font-black tabular-nums ${
                    v == null
                      ? PIT.sub
                      : wAdvice.status === 'green'
                        ? PIT.ok
                        : PIT.warn
                  }`}
                >
                  {v == null ? '—' : v}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── テンキー（親指到達域）── */}
        <div className="shrink-0">
          <PitKeypad
            onDigit={(d) => setDigits((prev) => appendDigit(prev, d, 3))}
            onBackspace={() => setDigits((prev) => backspace(prev))}
            onCommit={commit}
            commitEnabled={canCommit}
            commitLabel={
              isSuggestion
                ? t('quickEntry.tire.commitCarriedOver', { wheel: WHEEL_LABEL[active], value: pendingValue })
                : t('quickEntry.tire.commitWheel', { wheel: WHEEL_LABEL[active] })
            }
            onCancel={onCancel}
            cancelLabel={t('quickEntry.cancel')}
          />
        </div>
      </div>
    );
  },
);

TirePressureScene.displayName = 'TirePressureScene';
