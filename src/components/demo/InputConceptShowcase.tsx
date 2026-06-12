import React, { useState } from 'react';
import { MobileShell } from '../common/MobileShell';
import { CircularDial } from '../common/CircularDial';
import { PillButton } from '../common/PillButton';

const ConceptCard: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="rounded-[30px] bg-[var(--surface-raised)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_18px_35px_rgba(0,0,0,0.08)] border border-black/5 space-y-3">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-1">{title}</p>
      <p className="text-sm text-[var(--text-muted)]">{description}</p>
    </div>
    {children}
  </div>
);

const TileButton: React.FC<{
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-[20px] px-3 py-2 text-sm font-medium transition-all ${
      active
        ? 'bg-[var(--disc-black)] text-white shadow-[0_12px_25px_rgba(0,0,0,0.35)]'
        : 'bg-white/70 text-[var(--text-charcoal)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_12px_rgba(0,0,0,0.08)]'
    }`}
  >
    {label}
  </button>
);

export const InputConceptShowcase: React.FC = () => {
  const [lyricMode, setLyricMode] = useState<'off' | 'custom' | 'auto'>('custom');
  const [lyricText, setLyricText] = useState('Rewrite the hook with softer consonants.');
  const [strength, setStrength] = useState(62);
  const [duration, setDuration] = useState(3.5);
  const [texture, setTexture] = useState(7.5);
  const [chips, setChips] = useState<string[]>(['Breathe at the bridge', 'Hold note for 6s']);
  const [chipDraft, setChipDraft] = useState('');
  const [targetBpm, setTargetBpm] = useState(118);

  const lyricLimit = 160;

  const updateStrength = (next: number) => {
    const clamped = Math.max(0, Math.min(100, next));
    setStrength(clamped);
  };

  const updateDuration = (delta: number) => {
    setDuration((prev) => Number(Math.max(0.5, Math.min(10, prev + delta)).toFixed(1)));
  };

  const updateTexture = (preset: number) => {
    setTexture(() => Number(preset.toFixed(1)));
  };

  const addChip = () => {
    const text = chipDraft.trim();
    if (!text) return;
    setChips((prev) => [...prev, text]);
    setChipDraft('');
  };

  return (
    <MobileShell title="Input Lab" subtitle="Typography-first controls" onBack={() => window.history.back()}>
      <div className="space-y-6">
        <ConceptCard
          title="Story Pad"
          description="Large text tile for lyric edits with char counter & preset toggles."
        >
          <div className="grid grid-cols-3 gap-2">
            <TileButton label="Off vocal" active={lyricMode === 'off'} onClick={() => setLyricMode('off')} />
            <TileButton label="Custom lyrics" active={lyricMode === 'custom'} onClick={() => setLyricMode('custom')} />
            <TileButton label="Auto" active={lyricMode === 'auto'} onClick={() => setLyricMode('auto')} />
          </div>
          <div className="rounded-[24px] bg-white/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] border border-black/5">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]/80 mb-2">
              <span>Prompt</span>
              <span>{lyricText.length}/{lyricLimit}</span>
            </div>
            <textarea
              value={lyricText}
              onChange={(e) => setLyricText(e.target.value.slice(0, lyricLimit))}
              rows={3}
              className="w-full bg-transparent focus:outline-none text-lg font-semibold leading-snug resize-none text-[var(--text-charcoal)]"
              placeholder="How would you like to edit the lyrics?"
            />
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-[var(--text-muted)]">Mode: {lyricMode}</span>
              <PillButton label="Apply" variant="filled" />
            </div>
          </div>
        </ConceptCard>

        <ConceptCard
          title="Dial + Inline"
          description="Disc gesture for coarse movement, inline number for precise override."
        >
          <div className="flex flex-col md:flex-row gap-5 items-center">
            <CircularDial
              label="Strength"
              helper="Drag the dot"
              value={strength}
              onChange={updateStrength}
              min={0}
              max={100}
              size={150}
            />
            <div className="flex-1 w-full space-y-3">
              <div>
                <p className="uppercase text-xs tracking-[0.3em] text-[var(--text-muted)]">Manual override</p>
                <div className="mt-2 flex items-center gap-3 rounded-[22px] bg-white/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] border border-black/5">
                  <input
                    type="number"
                    value={Math.round(strength)}
                    onChange={(e) => updateStrength(parseInt(e.target.value) || 0)}
                    className="bg-transparent text-4xl font-semibold w-20 focus:outline-none text-[var(--text-charcoal)]"
                  />
                  <span className="text-sm text-[var(--text-muted)]">Intensity</span>
                  <div className="ml-auto flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => updateStrength(strength + 1)}
                      className="rounded-full w-10 h-10 bg-[var(--disc-black)] text-white flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStrength(strength - 1)}
                      className="rounded-full w-10 h-10 bg-black/10 text-[var(--text-charcoal)] flex items-center justify-center"
                    >
                      −
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[35, 50, 80].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateStrength(preset)}
                    className="rounded-[18px] py-2 px-3 bg-black/5 text-sm font-semibold hover:bg-black/10 transition"
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ConceptCard>

        <ConceptCard
          title="Segmented Stepper"
          description="Number tile that feels tactile with macro/micro adjustments."
        >
          <div className="rounded-[26px] bg-[var(--bg-shell-light)] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="uppercase text-xs tracking-[0.3em] text-[var(--text-muted)]">Hold time</p>
                <p className="text-4xl font-semibold text-[var(--text-charcoal)]">{duration.toFixed(1)}s</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateDuration(-0.5)}
                  className="w-12 h-12 rounded-full bg-black/10 text-2xl flex items-center justify-center"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => updateDuration(0.5)}
                  className="w-12 h-12 rounded-full bg-[var(--accent-sunset)] text-white text-2xl flex items-center justify-center shadow-[0_15px_30px_rgba(244,88,27,0.35)]"
                >
                  +
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {[-1, -0.2, 0.2, 1].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => updateDuration(delta)}
                  className="rounded-[18px] py-2 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
            <div className="rounded-[22px] bg-white/80 px-4 py-3 flex items-center gap-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] border border-black/5">
              <span className="uppercase tracking-[0.3em] text-[var(--text-muted)]">Texture</span>
              <input
                type="number"
                value={texture}
                step="0.1"
                onChange={(e) => updateTexture(parseFloat(e.target.value) || 0)}
                className="bg-transparent text-xl font-semibold w-16 focus:outline-none text-[var(--text-charcoal)]"
              />
              <div className="flex gap-2 ml-auto">
                {[6.5, 7.5, 8.5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateTexture(preset)}
                    className="px-3 py-1 rounded-full bg-black/5 text-sm"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ConceptCard>

        <ConceptCard
          title="Cue Chips"
          description="Token-based text plus inline BPM control for numeric confirmation."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="px-3 py-1.5 rounded-full bg-black/10 text-sm font-medium text-[var(--text-charcoal)]"
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] border border-black/5">
              <input
                value={chipDraft}
                onChange={(e) => setChipDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip();
                  }
                }}
                placeholder="Type cue and press enter"
                className="flex-1 bg-transparent focus:outline-none text-[var(--text-charcoal)]"
              />
              <button
                type="button"
                onClick={addChip}
                className="text-sm font-semibold text-[var(--accent-sunset)]"
              >
                Add
              </button>
            </div>
            <div className="flex items-center justify-between rounded-[22px] bg-[var(--bg-shell-light)] px-4 py-3">
              <div>
                <p className="uppercase text-xs tracking-[0.3em] text-[var(--text-muted)]">Target BPM</p>
                <p className="text-3xl font-semibold">{targetBpm}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={targetBpm}
                  onChange={(e) => setTargetBpm(parseInt(e.target.value) || 0)}
                  className="w-20 bg-white/80 rounded-2xl text-center py-2 text-xl font-semibold focus:outline-none"
                />
                <div className="grid grid-rows-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTargetBpm((prev) => prev + 2)}
                    className="w-10 h-10 rounded-full bg-[var(--disc-black)] text-white flex items-center justify-center"
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetBpm((prev) => prev - 2)}
                    className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center"
                  >
                    −2
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ConceptCard>
      </div>
    </MobileShell>
  );
};

export default InputConceptShowcase;
