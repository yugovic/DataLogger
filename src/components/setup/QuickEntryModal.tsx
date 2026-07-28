// 連続入力フロー: 未入力の項目だけを 環境→タイヤ→ラップ の順で
// 1問1画面のフルスクリーンモーダルで流す（第1弾: 環境データ・タイヤ情報・ラップタイムの3カード）。
//
// スキップした項目は null（空文字）のまま保存する。0変換・デモ初期値は禁止（データ品質方針）。
// 既存の setter（useSetupDraft の setField 経由）にそのまま書き込み、保存経路は無改修。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, type InputRef } from 'antd';
import { StepNumber } from '../common/StepNumber';
import { TirePressureScene, type TirePressureSceneHandle } from './TirePressureScene';
import { buildQuickEntrySteps, type QuickEntryFieldId, type QuickEntryFieldState, type WheelKey } from '../../lib/quickEntryFlow';
import { WEATHER_CODES } from '../../lib/weather';

interface TirePressures {
  fl: { before: string; after: string; diff: string };
  fr: { before: string; after: string; diff: string };
  rl: { before: string; after: string; diff: string };
  rr: { before: string; after: string; diff: string };
}

export interface QuickEntryModalProps {
  open: boolean;
  onClose: () => void;
  weather: string;
  setWeather: (v: string) => void;
  airTemp: string;
  setAirTemp: (v: string) => void;
  trackTemp: string;
  setTrackTemp: (v: string) => void;
  humidity: string;
  setHumidity: (v: string) => void;
  pressure: string;
  setPressure: (v: string) => void;
  tirePressures: TirePressures;
  setTirePressures: React.Dispatch<React.SetStateAction<TirePressures>>;
  targetPressures: { front: string; rear: string };
  bestLap: string;
  setBestLap: (v: string) => void;
  totalLaps: string;
  setTotalLaps: (v: string) => void;
}

const isTirePressureFilled = (tp: TirePressures): boolean =>
  (['fl', 'fr', 'rl', 'rr'] as WheelKey[]).every((w) => tp[w].after !== '' || tp[w].before !== '');

/** QuickEntryModal の中身。open のたびに新規マウントし、質問リストと進捗を初期化する */
const QuickEntryModalContent: React.FC<QuickEntryModalProps> = (props) => {
  const { t } = useTranslation('setup');
  const {
    onClose, weather, setWeather, airTemp, setAirTemp, trackTemp, setTrackTemp,
    humidity, setHumidity, pressure, setPressure, tirePressures, setTirePressures,
    targetPressures, bestLap, setBestLap, totalLaps, setTotalLaps,
  } = props;

  const initialState: QuickEntryFieldState = useMemo(() => ({
    weather, airTemp, trackTemp, humidity, pressure,
    tirePressureFilled: isTirePressureFilled(tirePressures),
    bestLap, totalLaps,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const [steps] = useState<QuickEntryFieldId[]>(() => buildQuickEntrySteps(initialState));
  const [index, setIndex] = useState(0);
  const sceneRef = useRef<TirePressureSceneHandle>(null);
  const inputRef = useRef<InputRef>(null);

  const total = steps.length;
  const current = steps[index];

  const goNext = () => {
    if (index >= total - 1) {
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  };

  useEffect(() => {
    if (total === 0) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (el && typeof el.focus === 'function') {
      const timer = window.setTimeout(() => el.focus(), 150);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [index]);

  if (total === 0 || !current) return null;

  const progressPct = ((index + (current === 'tirePressure' ? 0.5 : 0)) / total) * 100;

  const renderChips = (fieldLabel: string, options: { value: string; label: string }[], value: string, onSelect: (v: string) => void) => (
    <div className="flex flex-1 flex-col justify-center gap-3 px-5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{fieldLabel}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              onSelect(o.value);
              window.setTimeout(goNext, 200);
            }}
            className={`rounded-full border px-4 py-2 text-sm ${
              value === o.value
                ? 'border-blue-400 bg-blue-50 font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
                : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500">{t('quickEntry.hintChips')}</span>
    </div>
  );

  const renderNum = (fieldLabel: string, unit: string, value: string, onChange: (v: string) => void) => {
    const num = value === '' ? null : parseFloat(value);
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 px-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{fieldLabel} ({unit})</span>
        <StepNumber
          value={Number.isNaN(num as number) ? null : num}
          onChange={(n) => onChange(n === null ? '' : String(n))}
          min={-50}
          max={2000}
          step={1}
          largeStep={5}
          size="large"
          inputWidth={110}
          unit={unit}
        />
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('quickEntry.hintQuickButtons')}</span>
      </div>
    );
  };

  const renderLapTime = () => (
    <div className="flex flex-1 flex-col justify-center gap-3 px-5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{t('quickEntry.fields.bestLap')}</span>
      <Input
        ref={inputRef}
        value={bestLap}
        onChange={(e) => setBestLap(e.target.value)}
        placeholder={t('lap.bestLapPlaceholder')}
        className="text-2xl font-bold"
        size="large"
        onPressEnter={goNext}
      />
    </div>
  );

  const renderTirePressure = () => (
    <TirePressureScene
      ref={sceneRef}
      cold={{ fl: tirePressures.fl.before, fr: tirePressures.fr.before, rl: tirePressures.rl.before, rr: tirePressures.rr.before }}
      hot={{ fl: tirePressures.fl.after, fr: tirePressures.fr.after, rl: tirePressures.rl.after, rr: tirePressures.rr.after }}
      targetPressures={targetPressures}
      onChangeCold={(wheel, raw) => setTirePressures((prev) => ({ ...prev, [wheel]: { ...prev[wheel], before: raw } }))}
      onChangeHot={(wheel, raw) => setTirePressures((prev) => ({ ...prev, [wheel]: { ...prev[wheel], after: raw } }))}
    />
  );

  let body: React.ReactNode;
  switch (current) {
    case 'weather':
      body = renderChips(
        t('quickEntry.fields.weather'),
        WEATHER_CODES.map((v) => ({ value: v, label: t(`common:weather.${v}`) })),
        weather,
        setWeather,
      );
      break;
    case 'airTemp':
      body = renderNum(t('quickEntry.fields.airTemp'), '°C', airTemp, setAirTemp);
      break;
    case 'trackTemp':
      body = renderNum(t('quickEntry.fields.trackTemp'), '°C', trackTemp, setTrackTemp);
      break;
    case 'humidity':
      body = renderNum(t('quickEntry.fields.humidity'), '%', humidity, setHumidity);
      break;
    case 'pressure':
      body = renderNum(t('quickEntry.fields.pressure'), 'hPa', pressure, setPressure);
      break;
    case 'tirePressure':
      body = renderTirePressure();
      break;
    case 'bestLap':
      body = renderLapTime();
      break;
    case 'totalLaps':
      body = renderNum(t('quickEntry.fields.totalLaps'), t('lap.totalLaps'), totalLaps, setTotalLaps);
      break;
    default:
      body = null;
  }

  const isChipsStep = current === 'weather';
  const nextLabel = current === 'tirePressure' ? t('quickEntry.tire.nextWheel') : t('quickEntry.next');

  const handleNext = () => {
    if (current === 'tirePressure') {
      const done = sceneRef.current?.advance();
      if (done) goNext();
      return;
    }
    goNext();
  };

  const handleSkip = () => {
    goNext();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-xs tracking-wide text-gray-400">{t('quickEntry.stepCount', { current: index + 1, total })}</span>
        <button type="button" onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400">
          {t('common:close')}
        </button>
      </div>
      <div className="mx-4 mt-2 h-[3px] rounded bg-gray-200 dark:bg-gray-700">
        <div className="h-full rounded bg-blue-500 transition-[width]" style={{ width: `${Math.max(10, progressPct)}%` }} />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto py-2">{body}</div>
      <div className="flex gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        {!isChipsStep && (
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {t('quickEntry.skip')}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          className={`${isChipsStep ? 'flex-1' : 'flex-[2]'} rounded-lg bg-blue-500 py-3 text-sm font-semibold text-white`}
        >
          {nextLabel} ›
        </button>
      </div>
    </div>
  );
};

export const QuickEntryModal: React.FC<QuickEntryModalProps> = (props) => {
  if (!props.open) return null;
  return <QuickEntryModalContent {...props} />;
};
