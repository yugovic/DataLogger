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
import { PitKeypad } from './PitKeypad';
import { PIT } from '../../lib/pitTheme';
import { TirePressureScene, type TirePressureSceneHandle } from './TirePressureScene';
import { TirePressureSceneRefined } from './TirePressureSceneRefined';
import { CornerFeelingStep } from './CornerFeelingStep';
import { fieldFor, hasFeedback, type CornerSpot } from '../../lib/cornerFeedback';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildQuickEntrySteps,
  type QuickEntryFieldId,
  type QuickEntryFieldState,
  type WheelKey,
} from '../../lib/quickEntryFlow';
import {
  appendDigit, backspace, formatLapDigits, isValidLapDigits, lapStringToDigits,
} from '../../lib/pitKeypadInput';
import type { DrivingFeedback } from '../../types/setup';

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
  /** ドライバー評価。コーナー区分つきで記録する */
  drivingFeedback: DrivingFeedback;
  onFeedbackChange: (key: keyof DrivingFeedback, value: number | null) => void;
  /** 前回同一条件の温間空気圧（引き継ぎ候補） */
  carriedOverPressures?: Record<WheelKey, number | null> | null;
}

// このフローは走行直後の「温間」を記録する。冷間(before)が埋まっていても
// 温間が空なら聞かなければならない（before で満たしたと見なすと、
// 基本記録タスクが未完了のまま終わる）。
const isTirePressureFilled = (tp: TirePressures): boolean =>
  (['fl', 'fr', 'rl', 'rr'] as WheelKey[]).every((w) => tp[w].after !== '');

const QuickEntryModalContent: React.FC<QuickEntryModalProps> = (props) => {
  const { t } = useTranslation('setup');
  const { appearance } = useTheme();
  const {
    onClose, airTemp, setAirTemp, tirePressures, setTirePressures,
    targetPressures, bestLap, setBestLap, drivingFeedback, onFeedbackChange, carriedOverPressures,
  } = props;

  const initialState: QuickEntryFieldState = useMemo(() => ({
    airTemp,
    tirePressureFilled: isTirePressureFilled(tirePressures),
    bestLap,
    feeling: hasFeedback(drivingFeedback) ? 1 : null,
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

  // 洗練モードは near-black ＋ 骨色。ベーシックは既存の PIT トークン
  const refinedMode = appearance === 'refined';
  const cText = refinedMode ? 'text-[#f6f5e8]' : PIT.text;
  const cSub = refinedMode ? 'text-[#a8a79b]' : PIT.sub;

  const stepHeader = (title: string, hint?: string) => (
    <div className="px-4 pt-2">
      <div className={`text-center text-lg font-bold ${cText}`}>{title}</div>
      {hint && <div className={`mt-1 text-center text-base font-semibold ${cSub}`}>{hint}</div>}
    </div>
  );

  /** 大きな数値表示（触らない領域） */
  const bigValue = (text: string, unit: string) => (
    <div className="mt-3 flex items-baseline justify-center gap-2">
      <span className={`text-6xl font-black tabular-nums ${text === '' ? cSub : cText}`}>
        {text === '' ? '—' : text}
      </span>
      <span className={`text-xl font-bold ${cSub}`}>{unit}</span>
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

    case 'tirePressure': {
      // 保存経路も入力の意味も同じで、見せ方だけが違う2つの実装を外観設定で選ぶ
      const hot = {
        fl: tirePressures.fl.after, fr: tirePressures.fr.after,
        rl: tirePressures.rl.after, rr: tirePressures.rr.after,
      };
      const cold = {
        fl: tirePressures.fl.before, fr: tirePressures.fr.before,
        rl: tirePressures.rl.before, rr: tirePressures.rr.before,
      };
      const onChangeHot = (wheel: WheelKey, raw: string) =>
        setTirePressures((prev) => ({ ...prev, [wheel]: { ...prev[wheel], after: raw } }));
      const onChangeCold = (wheel: WheelKey, raw: string) =>
        setTirePressures((prev) => ({ ...prev, [wheel]: { ...prev[wheel], before: raw } }));

      body = appearance === 'refined' ? (
        <TirePressureSceneRefined
          cold={cold}
          onChangeCold={onChangeCold}
          hot={hot}
          targetPressures={targetPressures}
          carriedOver={carriedOverPressures}
          onChangeHot={onChangeHot}
          onDone={goNext}
          onCancel={onClose}
        />
      ) : (
        <TirePressureScene
          ref={sceneRef}
          cold={cold}
          onChangeCold={onChangeCold}
          hot={hot}
          targetPressures={targetPressures}
          carriedOver={carriedOverPressures}
          onChangeHot={onChangeHot}
          onDone={goNext}
          onCancel={onClose}
        />
      );
      break;
    }

    case 'bestLap': {
      const commit = () => {
        if (isValidLapDigits(lapDigits)) setBestLap(formatLapDigits(lapDigits));
        goNext();
      };
      body = (
        <div className="flex flex-1 flex-col">
          {stepHeader(t('quickEntry.fields.bestLap'), t('quickEntry.lapHint'))}
          {/* 60px の文字を inline のまま置くと、親の line-height より背が高くなって
              下にはみ出す。flex + leading-none で箱の高さを文字に合わせる */}
          <div className="mt-3 flex justify-center">
            <span className={`text-6xl font-black leading-none tabular-nums ${lapDigits === '' ? cSub : cText}`}>
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
      // 「アンダー/オーバー」だけでは記録にならない。どの速度域のどの局面かまで残す。
      // 9項目すべては聞かず、気になった箇所だけを選んで方向を答える形にする。
      body = (
        <CornerFeelingStep
          feedback={drivingFeedback}
          refined={refinedMode}
          onRate={(spot: CornerSpot, value: number) => onFeedbackChange(fieldFor(spot), value)}
          onNoIssue={() => {
            // 9項目を N で埋めない。「全体としてニュートラルだった」だけを残す
            onFeedbackChange('overallBalance', 2);
            goNext();
          }}
          onDone={goNext}
          onCancel={onClose}
        />
      );
      break;

    default:
      body = null;
  }

  const progressPct = ((index + 1) / total) * 100;

  // 洗練モードは near-black の地色。進捗表示も同じ面に合わせる
  const refined = appearance === 'refined';

  return (
    <div className={`fixed inset-0 z-[1100] flex flex-col ${refined ? 'bg-[#06070a]' : 'bg-gray-50 dark:bg-gray-900'}`}>
      {/* 進捗は読むだけ。触る操作は下側に集約している */}
      <div className="px-4 pt-2">
        <div className={`text-center text-sm font-bold ${refined ? 'text-[#a8a79b]' : PIT.sub}`}>
          {t('quickEntry.stepCount', { current: index + 1, total })}
        </div>
        <div className={`mt-1 h-[8px] rounded border ${
          refined ? 'border-[#232733] bg-[#101218]' : 'border-gray-700 bg-white dark:border-gray-200 dark:bg-gray-900'
        }`}>
          <div
            className={`h-full rounded-l transition-[width] ${refined ? 'bg-[#f6f5e8]' : 'bg-blue-800 dark:bg-blue-200'}`}
            style={{ width: `${progressPct}%` }}
          />
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
