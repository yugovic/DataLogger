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
import { SkinSample } from './SkinSample';
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
// ThemeProvider がマウント時に localStorage を読んでクラスを付け直すので、
// URL パラメータは「クラスを直接足す」のではなく localStorage 経由で渡す。
// （直接 add すると Provider の toggle に打ち消されてダークが測れなかった）
const dark = params.get('theme') === 'dark';
const refined = params.get('appearance') === 'refined';
localStorage.setItem('darkMode', JSON.stringify(dark));
localStorage.setItem('appearance', refined ? 'refined' : 'basic');

// シーンごとの初期状態。QuickEntryModal は「マウント時の状態」で質問リストを
// 決めるので、useEffect で後から入れると測りたい画面に辿り着けない。
// 必ず useState の初期値として渡すこと。
function presetFor(sc: string) {
  const tp = emptyPressures();
  const allWheels = () => (['fl', 'fr', 'rl', 'rr'] as const).forEach((w) => { tp[w].after = '220'; });

  if (sc === 'tire' || sc === 'carry') return { tp, lap: '1:58.423', feel: 2 };
  if (sc === 'tire-filled') { tp.fl.after = '218'; tp.fr.after = '222'; return { tp, lap: '1:58.423', feel: 2 }; }
  if (sc === 'lap') { allWheels(); return { tp, lap: '', feel: 2 }; }
  if (sc === 'feeling') { allWheels(); return { tp, lap: '1:58.423', feel: null as number | null }; }
  return { tp, lap: '', feel: null as number | null };
}

function Harness() {
  const preset = React.useMemo(() => presetFor(scene), []);
  const [tirePressures, setTirePressures] = useState(preset.tp);
  const [bestLap, setBestLap] = useState(preset.lap);
  const [feeling, setFeeling] = useState<number | null>(preset.feel);
  const [feedback, setFeedback] = useState<DrivingFeedback>(emptyFeedback);
  const [knowledge, setKnowledge] = useState<KnowledgeNote>({ intention: '', result: '', learning: '' });
  const [notes, setNotes] = useState('');

  if (scene === 'skin') {
    return <SkinSample />;
  }

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
