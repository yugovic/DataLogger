// タイヤ空気圧の入力（洗練モード）
//
// ベーシックモードの TirePressureScene と同じ役割・同じ保存経路で、見せ方だけが違う。
// near-black の地に骨色の数値を置き、リングゲージで目標レンジとの関係を示す。
//
// 入力方法は2つ:
// - 巨大数値の左右を押して増減する（押しっぱなしで加速）。数kPaの手直しはこれが速い
// - テンキーで3桁打つ。正確な値を入れたいときはこちら
//
// リング自体はドラッグしない（表示専用）。掴む操作はグローブで外しやすいため。
// 未測定の輪は null のまま（0埋め・デモ値は禁止 — データ品質方針）。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calcPressureAdvice, getWheelTarget } from '../../lib/pressureAdvice';
import { appendDigit, backspace, pressureDigitsToValue } from '../../lib/pitKeypadInput';
import {
  valueToAngle, clampValue, holdStepsAt,
} from '../../lib/pressureGauge';
import { WHEEL_ORDER, nextEmptyWheel, firstEmptyWheel, type WheelKey } from '../../lib/quickEntryFlow';

interface Props {
  hot: Record<WheelKey, string>;
  onChangeHot: (wheel: WheelKey, raw: string) => void;
  targetPressures: { front: string; rear: string };
  onDone: () => void;
  onCancel: () => void;
  carriedOver?: Record<WheelKey, number | null> | null;
}

const WHEEL_LABEL: Record<WheelKey, string> = { fl: 'FL', fr: 'FR', rl: 'RL', rr: 'RR' };
const toNum = (v: string): number | null => {
  if (v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

/** 長押しで加速する増減ボタン。経過時間から到達すべき歩数を求め、差分だけ適用する */
const HoldStepButton: React.FC<{
  direction: 1 | -1;
  onStep: (delta: number) => void;
  label: string;
  glyph: string;
  className: string;
  /** 到達域の例外申告。計測スクリプトが理由ごと出力する */
  reachExempt?: string;
}> = ({ direction, onStep, label, glyph, className, reachExempt }) => {
  const timer = useRef<number | null>(null);
  const started = useRef(0);
  const applied = useRef(0);

  const stop = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => stop, []);

  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (timer.current !== null) return;
    e.preventDefault();
    started.current = performance.now();
    applied.current = 0;
    onStep(direction); // 単発タップぶんを即座に反映
    timer.current = window.setInterval(() => {
      const want = holdStepsAt(performance.now() - started.current);
      if (want > applied.current) {
        onStep(direction * (want - applied.current));
        applied.current = want;
      }
    }, 40);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      data-reach-exempt={reachExempt}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStep(direction);
        }
      }}
    >
      <span className="text-2xl font-bold text-[#a8a79b]">{glyph}</span>
    </button>
  );
};

export const TirePressureSceneRefined: React.FC<Props> = ({
  hot, onChangeHot, targetPressures, onDone, onCancel, carriedOver,
}) => {
  const { t } = useTranslation('setup');

  const hotNum = useMemo(
    () => ({ fl: toNum(hot.fl), fr: toNum(hot.fr), rl: toNum(hot.rl), rr: toNum(hot.rr) }),
    [hot],
  );
  const [active, setActive] = useState<WheelKey>(() => firstEmptyWheel(hotNum) ?? 'fl');
  const [digits, setDigits] = useState('');

  const front = targetPressures.front !== '' ? parseFloat(targetPressures.front) : null;
  const rear = targetPressures.rear !== '' ? parseFloat(targetPressures.rear) : null;
  const targetOf = (w: WheelKey) => getWheelTarget(w, front, rear);
  const activeTarget = targetOf(active);

  const carriedForActive = carriedOver?.[active] ?? null;
  /** 実測値も打鍵もないとき、前回値を提案として出す（押すまで保存しない） */
  const isSuggestion = digits === '' && hotNum[active] == null && carriedForActive != null;
  const pending = digits !== ''
    ? pressureDigitsToValue(digits)
    : hotNum[active] ?? carriedForActive;

  const advice = calcPressureAdvice(pending, activeTarget);
  const inRange = pending != null && advice.status === 'green';

  const goToWheel = (w: WheelKey) => { setActive(w); setDigits(''); };

  /** 増減。未入力なら目標中央から始める（触るまで値を作らない） */
  const step = (delta: number) => {
    setDigits('');
    const base = hotNum[active] ?? carriedForActive;
    if (base == null) {
      onChangeHot(active, String(activeTarget ?? 220));
    } else {
      onChangeHot(active, String(clampValue(base + delta)));
    }
  };

  const commit = () => {
    if (pending == null) return;
    onChangeHot(active, String(pending));
    const next = nextEmptyWheel({ ...hotNum, [active]: pending }, active);
    setDigits('');
    if (next) setActive(next);
    else onDone();
  };

  const pressKey = (d: string) => {
    const next = appendDigit(digits, d, 3);
    if (next.length === 3) {
      const v = pressureDigitsToValue(next);
      if (v == null) return; // 範囲外は打ち間違い。受けない
      onChangeHot(active, String(v));
      setDigits('');
    } else {
      setDigits(next);
    }
  };

  const angle = pending != null ? valueToAngle(pending) : 0;
  const valueColor = pending == null ? 'text-[#a8a79b]' : inRange ? 'text-[#8fe0a4]' : 'text-[#f0b37a]';

  const keyClass =
    'flex items-center justify-center rounded-2xl border border-[#232733] bg-[#14171f] ' +
    'text-2xl font-bold tabular-nums text-[#f6f5e8] active:bg-[#1d212c]';
  const stepClass =
    'absolute top-[56px] flex h-[92px] w-16 items-center justify-center rounded-xl ' +
    'active:bg-[#f6f5e81a] touch-none';

  return (
    <div className="flex flex-1 flex-col bg-[#06070a] px-3">
      {/* ── 読む領域。ここを伸縮させて、下の操作群を親指の到達域
          （390x844 で y>=281。進捗ヘッダ48pxを引いて 233px）へ押し下げる ── */}
      <div className="flex flex-1 flex-col items-center justify-center" style={{ minHeight: 245 }}>
      <div className="relative mx-auto h-[176px] w-[204px] shrink-0" style={{ overflow: 'visible' }}>
        <svg viewBox="0 0 200 172" className="block h-[176px] w-[204px]" aria-hidden="true">
          <path d="M 39.19 160.81 A 86 86 0 1 1 160.81 160.81"
                fill="none" stroke="#1a1d26" strokeWidth="10" strokeLinecap="round" />
          {activeTarget != null && (
            <path d="M 75.03 17.71 A 86 86 0 0 1 124.97 17.71"
                  fill="none" stroke="#8fe0a4" strokeWidth="10" strokeLinecap="round" opacity="0.95" />
          )}
          <g transform={`rotate(${angle.toFixed(2)} 100 100)`} opacity={pending == null ? 0.25 : 1}>
            <line x1="100" y1="38" x2="100" y2="6" stroke="#f6f5e8" strokeWidth="4" strokeLinecap="round" />
            <line x1="100" y1="38" x2="100" y2="6" stroke="#f6f5e8" strokeWidth="10" strokeLinecap="round" opacity="0.18" />
          </g>
        </svg>

        <div className="pointer-events-none absolute left-1/2 top-[102px] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className={`text-[74px] font-bold leading-none tabular-nums ${valueColor}`}>
            {pending == null ? '—' : pending}
          </div>
          <div className="mt-0.5 text-[13px] tracking-[0.14em] text-[#a8a79b]">kPa</div>
        </div>

        {/* 数値の左右を押して増減する。テンキーが到達域内にあるので、
            こちらは「早く直すための補助手段」として上部に置く */}
        <HoldStepButton
          direction={-1}
          onStep={step}
          label={t('quickEntry.tire.decrease')}
          glyph="−"
          className={`${stepClass} -left-[26px]`}
          reachExempt="テンキーが到達域内にあり入力は完結する。±は早く直すための補助手段"
        />
        <HoldStepButton
          direction={1}
          onStep={step}
          label={t('quickEntry.tire.increase')}
          glyph="+"
          className={`${stepClass} -right-[26px]`}
          reachExempt="テンキーが到達域内にあり入力は完結する。±は早く直すための補助手段"
        />
      </div>

      <div className="mt-1 w-full shrink-0 text-center text-[13px] text-[#a8a79b]">
        {activeTarget != null
          ? t('quickEntry.tire.target', { lo: activeTarget - 5, hi: activeTarget + 5 })
          : t('quickEntry.tire.noTarget')}
        {pending != null && activeTarget != null && (
          <>
            {' · '}
            <b className={inRange ? 'text-[#8fe0a4]' : 'text-[#f0b37a]'}>
              {inRange ? t('quickEntry.tire.inRange') : t('quickEntry.tire.outOfRange')}
            </b>
          </>
        )}
        {isSuggestion && (
          <div className="mt-1 font-bold text-[#f6f5e8]">
            {t('quickEntry.tire.carriedOverBadge')}
          </div>
        )}
      </div>

      </div>

      {/* ── 触る領域: 4輪・テンキー・確定 ───────────────── */}
      <div className="grid shrink-0 grid-cols-4 gap-2">
        {WHEEL_ORDER.map((w) => {
          const v = hotNum[w];
          const a = calcPressureAdvice(v, targetOf(w));
          const on = active === w;
          return (
            <button
              key={w}
              type="button"
              onClick={() => goToWheel(w)}
              className={`flex flex-col items-center justify-center rounded-2xl border bg-[#101218] ${
                on ? 'border-[#f6f5e8] border-2' : 'border-[#232733]'
              }`}
              style={{ minHeight: 60 }}
            >
              <span className="text-[11px] font-bold tracking-[0.14em] text-[#a8a79b]">{WHEEL_LABEL[w]}</span>
              <span className={`text-xl font-bold tabular-nums ${
                v == null ? 'text-[#a8a79b]' : a.status === 'green' ? 'text-[#8fe0a4]' : 'text-[#f0b37a]'
              }`}>
                {v == null ? '—' : v}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => pressKey(d)} className={keyClass} style={{ minHeight: 60 }}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => pressKey('0')} className={`${keyClass} col-span-2`} style={{ minHeight: 60 }}>
          0
        </button>
        <button
          type="button"
          aria-label={t('quickEntry.tire.deleteDigit')}
          onClick={() => setDigits((p) => backspace(p))}
          className={keyClass}
          style={{ minHeight: 60 }}
        >
          ⌫
        </button>
      </div>

      <div className="mt-2 mb-3 grid shrink-0 grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center rounded-full border border-[#232733] text-base font-bold text-[#f6f5e8]"
          style={{ minHeight: 60 }}
        >
          {t('quickEntry.cancel')}
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={pending == null}
          className={`col-span-2 flex items-center justify-center rounded-full text-lg font-bold ${
            pending == null ? 'bg-[#14171f] text-[#a8a79b]' : 'bg-[#f6f5e8] text-[#0a0b10]'
          }`}
          style={{ minHeight: 60 }}
        >
          {isSuggestion
            ? t('quickEntry.tire.commitCarriedOver', { wheel: WHEEL_LABEL[active], value: pending })
            : t('quickEntry.tire.commitWheel', { wheel: WHEEL_LABEL[active] })}
        </button>
      </div>
    </div>
  );
};
