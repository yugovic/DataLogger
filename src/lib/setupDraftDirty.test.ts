// 未保存離脱ガードのダーティ判定（serializeDraft / isDraftDirty）のテスト。
// これらは純粋関数のため React なしで検証できる（vitest environment: node）。

import { describe, it, expect } from 'vitest';
import {
  createEmptyDraft,
  serializeDraft,
  isDraftDirty,
  setupToDraft,
  copySetupToDraft,
  type SetupDraft,
} from './setupDraft';
import type { CarSetup } from '../types/setup';

const fullSetup = (overrides: Partial<CarSetup> = {}): CarSetup => ({
  id: 'setup-1',
  userId: 'user-1',
  driver: 'テストドライバー',
  visibility: 'private',
  anonymized: false,
  carModel: 'Honda S2000',
  vehicleId: 'vehicle-1',
  circuit: '鈴鹿サーキット',
  date: new Date('2026-05-01T10:00:00'),
  sessionType: 'qualifying',
  weather: { condition: '晴れ', airTemp: 22, trackTemp: 35, humidity: 40, pressure: 1013 },
  tireSettings: {
    fl: { before: 200, after: 210, diff: 10 },
    fr: { before: 200, after: 212, diff: 12 },
    rl: { before: 180, after: 190, diff: 10 },
    rr: { before: 180, after: 191, diff: 11 },
  },
  targetPressures: { front: 220, rear: 200 },
  tireInfo: { brand: 'ADVAN', compound: 'A050' },
  sessionInfo: { distance: 30, fuel: 40 },
  suspensionSettings: {
    frontDamper: { compression: 5, rebound: 6 },
    rearDamper: { compression: 4, rebound: 5 },
    springRate: { front: 10, rear: 8 },
    rideHeight: { front: 120, rear: 125 },
    antiRollBar: { front: 2, rear: 1 },
  },
  alignmentSettings: {
    camber: { front: -3, rear: -2 },
    toe: { front: 0, rear: 1 },
    caster: 6,
  },
  lapTimeData: { bestLap: '1:58.423', totalLaps: 12, laps: [], source: 'manual', evidence: null },
  telemetry: { traceIds: [], primaryTraceId: null, importStatus: 'none' },
  notes: 'メモ',
  createdAt: new Date('2026-05-01T09:00:00'),
  updatedAt: new Date('2026-05-01T09:00:00'),
  ...overrides,
});

describe('serializeDraft', () => {
  it('等価な draft は同じ文字列に直列化される（決定的）', () => {
    const a = createEmptyDraft();
    const b = createEmptyDraft();
    // sessionDate だけは new Date() で差が出るため揃える
    b.sessionDate = a.sessionDate;
    expect(serializeDraft(a)).toBe(serializeDraft(b));
  });

  it('Date（sessionDate）を含んでも文字列化できる', () => {
    const d = createEmptyDraft();
    expect(() => serializeDraft(d)).not.toThrow();
    expect(typeof serializeDraft(d)).toBe('string');
  });
});

describe('isDraftDirty', () => {
  it('基準スナップショット直後は未変更（クリーン）', () => {
    const draft = createEmptyDraft();
    const baseline = serializeDraft(draft);
    expect(isDraftDirty(baseline, draft)).toBe(false);
  });

  it('フィールドを変更するとダーティになる', () => {
    const draft = createEmptyDraft();
    const baseline = serializeDraft(draft);
    const edited: SetupDraft = { ...draft, circuit: '富士スピードウェイ' };
    expect(isDraftDirty(baseline, edited)).toBe(true);
  });

  it('ネストしたタイヤ空気圧の変更もダーティになる', () => {
    const draft = createEmptyDraft();
    const baseline = serializeDraft(draft);
    const edited: SetupDraft = {
      ...draft,
      tirePressures: { ...draft.tirePressures, fl: { before: '200', after: '210', diff: '+10' } },
    };
    expect(isDraftDirty(baseline, edited)).toBe(true);
  });

  it('変更を元に戻すとクリーンに戻る', () => {
    const draft = createEmptyDraft();
    const baseline = serializeDraft(draft);
    const edited: SetupDraft = { ...draft, notes: '一時的な入力' };
    expect(isDraftDirty(baseline, edited)).toBe(true);
    const reverted: SetupDraft = { ...edited, notes: '' };
    expect(isDraftDirty(baseline, reverted)).toBe(false);
  });

  it('既存読込直後の draft は自身の基準に対してクリーン', () => {
    const setup = fullSetup();
    const draft = setupToDraft(setup);
    const baseline = serializeDraft(draft);
    expect(isDraftDirty(baseline, draft)).toBe(false);
    // 1 項目でも編集すればダーティ
    const edited: SetupDraft = { ...draft, driver: '別ドライバー' };
    expect(isDraftDirty(baseline, edited)).toBe(true);
  });

  it('コピー読込直後の draft は自身の基準に対してクリーン', () => {
    const setup = fullSetup();
    const draft = copySetupToDraft(setup);
    const baseline = serializeDraft(draft);
    expect(isDraftDirty(baseline, draft)).toBe(false);
  });

  it('drivingFeedback の評価変更もダーティになる', () => {
    const draft = createEmptyDraft();
    const baseline = serializeDraft(draft);
    const edited: SetupDraft = {
      ...draft,
      drivingFeedback: { ...draft.drivingFeedback, balance: 3 },
    };
    expect(isDraftDirty(baseline, edited)).toBe(true);
  });
});
