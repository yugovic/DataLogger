// 連続入力フロー: 基本記録タスク（4輪空気圧・気温・ベストラップ・フィーリング1つ）だけを
// 1問1画面で流す。路面温度・湿度・気圧・天候・総周回数は既定フローから外し、
// 必要な人だけがカードを開いて入力する（聞く項目を減らすこと自体が最大の改善）。
//
// 気温・天候・湿度・気圧は autoWeather が観測値を入れるため、通常は気温も聞かない。
// 取得に失敗したときだけ気温を聞く。
//
// 画面設計は「グローブ・直射日光・片手親指」から逆算:
// - 触るものはすべて画面下側（親指到達域）に置く。上部は読むだけ
// - すべての操作ターゲットは 60px 以上
// - 文字色は対背景 7:1 以上のみ（gray-400/500 は使わない）
// - 数値入力は OS キーボードでなく大型テンキー（出現待ちと記号切替を無くす）
//
// スキップした項目は null（空文字）のまま保存する。0変換・デモ初期値は禁止。
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PitKeypad, PIT_COLORS } from './PitKeypad';
import { TirePressureScene, type TirePressureSceneHandle } from './TirePressureScene';
import {
  buildQuickEntrySteps,
  type QuickEntryFieldId,
  type QuickEntryFieldState,
  type WheelKey,
} from '../../lib/quickEntryFlow';
import {
  appendDigit, backspace, formatLapDigits, isValidLapDigits, lapStringToDigits,
} from '../../lib/pitKeypadInput';

interface TirePressures {
  fl: { before: string; after: string; diff: string };
  fr: { before: string; after: string; diff: string };
  rl: { before: string; after: string; diff: string };
  rr: { before: string; after: string; diff: string };
}

export interface QuickEntryModalProps {
  open: boolean;
  onClose: () => void;
  airTemp: string;
  setAirTemp: (v: string) => void;
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
  targetPressures: { front: string; rear: string };
  bestLap: string;
  setBestLap: (v: string) => void;
  /** 総合バランス（0=強アンダー〜4=強オーバー）。未評価は null */
  feeling: number | null;
  setFeeling: (v: number | null) => void;
  /** 前回同一条件の温間空気圧（引き継ぎ候補） */
  carriedOverPressures?: Record<WheelKey, number | null> | null;
}

const isTirePressureFilled = (tp: TirePressures): boolean =>
  (['fl', 'fr', 'rl', 'rr'] as WheelKey[]).every((w) => tp[w].after !== '' || tp[w].before !== '');

/** 総合バランスの5択。数値は DrivingFeedback.overallBalance と同じ 0〜4 */
const FEELING_OPTIONS: { value: number; labelKey: string }[] = [
  { value: 0, labelKey: 'quickEntry.feeling.understeerStrong' },
  { value: 1, labelKey: 'quickEntry.feeling.understeerMild' },
  { value: 2, labelKey: 'quickEntry.feeling.neutral' },
  { value: 3, labelKey: 'quickEntry.feeling.oversteerMild' },
  { value: 4, labelKey: 'quickEntry.feeling.oversteerStrong' },
];

const QuickEntryModalContent: React.FC<QuickEntryModalProps> = (props) => {
  const { t } = useTranslation('setup');
  const {
    onClose, airTemp, setAirTemp, tirePressures, setTirePressures,
    targetPressures, bestLap, setBestLap, feeling, setFeeling, carriedOverPressures,
  } = props;

  const initialState: QuickEntryFieldState = useMemo(() => ({
    airTemp,
    tirePressureFilled: isTirePressureFilled(tirePressures),
    bestLap,
    feeling,
    // 起動時の状態で質問リストを決める（入力中に増減させない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const [steps] = useState<QuickEntryFieldId[]>(() => buildQuickEntrySteps(initialState));
  const [index, setIndex] = useState(0);
  const sceneRef = useRef<TirePressureSceneHandle>(null);

  /** テンキーで打っている途中の数字列（気温・ラップで使う） */
  const [tempDigits, setTempDigits] = useState('');
  const [lapDigits, setLapDigits] = useState(() => lapStringToDigits(bestLap));

  const total = steps.length;
  const current = steps[index];

  const goNext = () => {
    if (index >= total - 1) onClose();
    else setIndex((i) => i + 1);
  };

  if (total === 0 || !current) return null;

  const stepHeader = (title: string, hint?: string) => (
    <div className="px-4 pt-2">
      <div className={`text-center text-lg font-bold ${PIT_COLORS.text}`}>{title}</div>
      {hint && <div className={`mt-1 text-center text-base font-semibold ${PIT_COLORS.sub}`}>{hint}</div>}
    </div>
  );

  /** 大きな数値表示（触らない領域） */
  const bigValue = (text: string, unit: string) => (
    <div className="mt-3 flex items-baseline justify-center gap-2">
      <span className={`text-6xl font-black tabular-nums ${text === '' ? PIT_COLORS.sub : PIT_COLORS.text}`}>
        {text === '' ? '—' : text}
      </span>
      <span className={`text-xl font-bold ${PIT_COLORS.sub}`}>{unit}</span>
    </div>
  );

  let body: React.ReactNode;

  switch (current) {
    case 'airTemp': {
      // 自動取得に失敗したときだけ現れる。手入力の負担を最小にするためテンキー2タップ想定。
      const commit = () => {
        if (tempDigits !== '') setAirTemp(tempDigits);
        goNext();
      };
      body = (
        <div className="flex flex-1 flex-col">
          {stepHeader(t('quickEntry.fields.airTemp'), t('quickEntry.autoFailedHint'))}
          {bigValue(tempDigits, '°C')}
          <div className="mt-auto">
            <PitKeypad
              onDigit={(d) => setTempDigits((p) => appendDigit(p, d, 2))}
              onBackspace={() => setTempDigits((p) => backspace(p))}
              onCommit={commit}
              commitEnabled={tempDigits !== ''}
              commitLabel={t('quickEntry.next')}
              onCancel={onClose}
              cancelLabel={t('quickEntry.cancel')}
            />
          </div>
        </div>
      );
      break;
    }

    case 'tirePressure':
      body = (
        <TirePressureScene
          ref={sceneRef}
          cold={{ fl: tirePressures.fl.before, fr: tirePressures.fr.before, rl: tirePressures.rl.before, rr: tirePressures.rr.before }}
          hot={{ fl: tirePressures.fl.after, fr: tirePressures.fr.after, rl: tirePressures.rl.after, rr: tirePressures.rr.after }}
          targetPressures={targetPressures}
          carriedOver={carriedOverPressures}
          onChangeCold={(wheel, raw) => setTirePressures((prev) => ({ ...prev, [wheel]: { ...prev[wheel], before: raw } }))}
          onChangeHot={(wheel, raw) => setTirePressures((prev) => ({ ...prev, [wheel]: { ...prev[wheel], after: raw } }))}
          onDone={goNext}
          onCancel={onClose}
        />
      );
      break;

    case 'bestLap': {
      const commit = () => {
        if (isValidLapDigits(lapDigits)) setBestLap(formatLapDigits(lapDigits));
        goNext();
      };
      body = (
        <div className="flex flex-1 flex-col">
          {stepHeader(t('quickEntry.fields.bestLap'), t('quickEntry.lapHint'))}
          <div className="mt-3 text-center">
            <span className={`text-6xl font-black tabular-nums ${lapDigits === '' ? PIT_COLORS.sub : PIT_COLORS.text}`}>
              {lapDigits === '' ? '—' : formatLapDigits(lapDigits)}
            </span>
          </div>
          <div className="mt-auto">
            <PitKeypad
              onDigit={(d) => setLapDigits((p) => appendDigit(p, d, 7))}
              onBackspace={() => setLapDigits((p) => backspace(p))}
              onCommit={commit}
              commitEnabled={lapDigits === '' || isValidLapDigits(lapDigits)}
              commitLabel={t('quickEntry.next')}
              onCancel={onClose}
              cancelLabel={t('quickEntry.cancel')}
            />
          </div>
        </div>
      );
      break;
    }

    case 'feeling':
      // スライダーを廃した理由: ハンドルが 10x10px しかなく、グローブでは掴めない。
      // 5択の大型ボタンにして1タップで確定する。
      body = (
        <div className="flex flex-1 flex-col">
          {stepHeader(t('quickEntry.feeling.title'), t('quickEntry.feeling.hint'))}
          <div className="mt-auto flex flex-col gap-2 px-3 pb-3">
            {FEELING_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setFeeling(o.value);
                  goNext();
                }}
                className={`flex items-center justify-center rounded-xl border-2 text-lg font-bold ${
                  feeling === o.value
                    ? 'border-blue-800 bg-blue-800 text-white'
                    : `border-gray-500 bg-white ${PIT_COLORS.text} dark:border-gray-400 dark:bg-gray-700`
                }`}
                style={{ minHeight: 64 }}
              >
                {t(o.labelKey)}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              className={`flex items-center justify-center rounded-xl border-2 border-gray-500 bg-white text-base font-bold ${PIT_COLORS.text} dark:border-gray-400 dark:bg-gray-700`}
              style={{ minHeight: 64 }}
            >
              {t('quickEntry.cancel')}
            </button>
          </div>
        </div>
      );
      break;

    default:
      body = null;
  }

  const progressPct = ((index + 1) / total) * 100;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 進捗は読むだけ。触る操作は下側に集約している */}
      <div className="px-4 pt-2">
        <div className={`text-center text-sm font-bold ${PIT_COLORS.sub}`}>
          {t('quickEntry.stepCount', { current: index + 1, total })}
        </div>
        <div className="mt-1 h-[6px] rounded bg-gray-300 dark:bg-gray-600">
          <div className="h-full rounded bg-blue-800 transition-[width]" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">{body}</div>
    </div>
  );
};

export const QuickEntryModal: React.FC<QuickEntryModalProps> = (props) => {
  if (!props.open) return null;
  return <QuickEntryModalContent {...props} />;
};
