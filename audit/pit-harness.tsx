/**
 * ピット実用性オーディット用の描画ハーネス（開発時のみ・アプリ本体には含まれない）
 *
 * 認証やFirestoreを経由せずに、実際のコンポーネントを 390x844 で描画して
 * 寸法・配色・レイアウトを実測・記録するためのページ。
 * `?scene=` で表示するシーンを切り替える。
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/i18n';
import { QuickEntryModal } from '../src/components/setup/QuickEntryModal';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { DrivingTab } from '../src/components/setup/tabs/DrivingTab';
import type { DrivingFeedback, KnowledgeNote } from '../src/types/setup';

const emptyPressures = () => ({
  fl: { before: '', after: '', diff: '' },
  fr: { before: '', after: '', diff: '' },
  rl: { before: '', after: '', diff: '' },
  rr: { before: '', after: '', diff: '' },
});

const emptyFeedback = (): DrivingFeedback => ({
  overallBalance: null, lowSpeedEntry: null, lowSpeedMiddle: null, lowSpeedExit: null,
  highSpeedEntry: null, highSpeedMiddle: null, highSpeedExit: null,
  brakeInitial: null, brakeMiddle: null, brakeStability: null,
  accelResponse: null, accelTraction: null, balance: null, confidence: null,
});

const params = new URLSearchParams(location.search);
const scene = params.get('scene') ?? 'tire';
const dark = params.get('theme') === 'dark';
if (dark) document.documentElement.classList.add('dark');
// 洗練モードは ThemeProvider を通さずに直接指定する（計測用）
const refined = params.get('appearance') === 'refined';
if (refined) {
  document.documentElement.classList.add('dark', 'refined');
  localStorage.setItem('appearance', 'refined');
} else {
  localStorage.setItem('appearance', 'basic');
}

function Harness() {
  const [tirePressures, setTirePressures] = useState(emptyPressures);
  const [bestLap, setBestLap] = useState(scene === 'lap' ? '' : '1:58.423');
  const [feeling, setFeeling] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<DrivingFeedback>(emptyFeedback);
  const [knowledge, setKnowledge] = useState<KnowledgeNote>({ intention: '', result: '', learning: '' });
  const [notes, setNotes] = useState('');

  // シーンごとに、そのステップが先頭に来るよう入力済み状態を仕込む
  const preset = React.useMemo(() => {
    if (scene === 'tire') return { tp: emptyPressures(), lap: '1:58.423', feel: 2 };
    if (scene === 'tire-filled') {
      const tp = emptyPressures();
      tp.fl.after = '218'; tp.fr.after = '222';
      return { tp, lap: '1:58.423', feel: 2 };
    }
    if (scene === 'lap') {
      const tp = emptyPressures();
      (['fl', 'fr', 'rl', 'rr'] as const).forEach((w) => { tp[w].after = '220'; });
      return { tp, lap: '', feel: 2 };
    }
    if (scene === 'feeling') {
      const tp = emptyPressures();
      (['fl', 'fr', 'rl', 'rr'] as const).forEach((w) => { tp[w].after = '220'; });
      return { tp, lap: '1:58.423', feel: null };
    }
    return { tp: emptyPressures(), lap: '', feel: null };
  }, []);

  React.useEffect(() => {
    setTirePressures(preset.tp);
    setBestLap(preset.lap);
    setFeeling(preset.feel);
  }, [preset]);

  if (scene === 'driving') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DrivingTab
          notes={notes}
          setNotes={setNotes}
          knowledge={knowledge}
          setKnowledge={setKnowledge}
          feedback={feedback}
          onFeedbackChange={(k, v) => setFeedback((p) => ({ ...p, [k]: v }))}
        />
      </div>
    );
  }

  return (
    <QuickEntryModal
      open
      onClose={() => {}}
      airTemp="25.4"
      setAirTemp={() => {}}
      tirePressures={tirePressures}
      setTirePressures={setTirePressures}
      targetPressures={{ front: '220', rear: '215' }}
      bestLap={bestLap}
      setBestLap={setBestLap}
      feeling={feeling}
      setFeeling={setFeeling}
      carriedOverPressures={scene === 'carry' ? { fl: 218, fr: 219, rl: 214, rr: 215 } : null}
    />
  );
}

createRoot(document.getElementById('root')!).render(<ThemeProvider><Harness /></ThemeProvider>);
