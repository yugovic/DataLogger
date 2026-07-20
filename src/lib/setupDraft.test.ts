import { describe, it, expect } from 'vitest';
import {
  createEmptyDraft,
  setupToDraft,
  copySetupToDraft,
  inheritSetupSettings,
  draftToSetupInput,
  emptyDrivingFeedback,
  type SetupDraft,
} from './setupDraft';
import { carSetupSchema } from '../schemas/setupSchema';
import type { CarSetup } from '../types/setup';

// 完全に埋まった CarSetup を組み立てるヘルパー
const fullSetup = (overrides: Partial<CarSetup> = {}): CarSetup => ({
  id: 'setup-1',
  userId: 'user-1',
  driver: 'テストドライバー',
  visibility: 'shared',
  anonymized: true,
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
    rr: { before: 180, after: 188, diff: 8 },
  },
  tireInfo: { brand: 'ADVAN', compound: 'A050' },
  sessionInfo: { distance: 120, fuel: 30 },
  targetPressures: { front: 200, rear: 190 },
  suspensionSettings: {
    frontDamper: { compression: 8, rebound: 10 },
    rearDamper: { compression: 6, rebound: 7 },
    springRate: { front: 12, rear: 10 },
    rideHeight: { front: 110, rear: 115 },
    antiRollBar: { front: 20, rear: 18 },
  },
  alignmentSettings: {
    camber: { front: -3, rear: -2 },
    toe: { front: 1, rear: 2 },
    caster: 6,
  },
  brakeSettings: { frontPad: 'Type A', rearPad: 'Type B', frontRotor: '2-piece', rearRotor: '1-piece', balance: 62 },
  aeroSettings: { front: 3, rear: 7 },
  engineSettings: { ecuMap: 'Map 2', boost: 120 },
  adjustmentValues: [{
    definitionId: 'rear-damper',
    group: 'damper',
    label: 'リア減衰力',
    position: 'rear',
    valueType: 'number',
    unit: 'click',
    value: 7,
  }],
  drivingFeedback: {
    ...emptyDrivingFeedback(),
    balance: 3,
    confidence: 4,
  },
  notes: 'よく曲がる',
  knowledge: { intention: '車高を下げた', result: 'ロール減', learning: '次はバネも' },
  lapTimeData: {
    bestLap: '1:58.423',
    totalLaps: 12,
    laps: [{ lapNumber: 1, time: '1:58.423', type: 'NORMAL' }],
    source: 'logger',
    evidence: { fileName: 'run.csv', format: 'aim-csv', importedAt: new Date('2026-05-01T11:00:00'), trackId: 'suzuka' },
  },
  telemetry: { traceIds: ['trace-1'], primaryTraceId: 'trace-1', importStatus: 'trace_saved' },
  createdAt: new Date('2026-05-01T10:00:00'),
  updatedAt: new Date('2026-05-01T10:00:00'),
  ...overrides,
});

// ─── createEmptyDraft ────────────────────────────────────────────────────

describe('createEmptyDraft', () => {
  it('全数値項目が空/null で、デモ初期値を含まない', () => {
    const d = createEmptyDraft();
    expect(d.airTemp).toBe('');
    expect(d.frontDamperCompression).toBeNull();
    expect(d.frontSpringRate).toBe('');
    expect(d.visibility).toBe('private');
    expect(d.anonymized).toBe(false);
    expect(d.lapSource).toBe('manual');
    // drivingFeedback は全項目 null
    expect(Object.values(d.drivingFeedback).every((v) => v === null)).toBe(true);
  });
});

// ─── setupToDraft ↔ draftToSetupInput ラウンドトリップ ─────────────────────

describe('setupToDraft → draftToSetupInput ラウンドトリップ', () => {
  it('保存済みの全項目が変換往復で一致する', () => {
    const setup = fullSetup();
    const draft = setupToDraft(setup);
    const out = draftToSetupInput(draft, 'user-1');

    expect(out.driver).toBe('テストドライバー');
    expect(out.carModel).toBe('Honda S2000');
    expect(out.vehicleId).toBe('vehicle-1');
    expect(out.circuit).toBe('鈴鹿サーキット');
    expect(out.sessionType).toBe('qualifying');
    expect(out.date).toEqual(setup.date); // 既存日時を保持（new Date() で上書きしない）
    expect(out.weather).toEqual({ ...setup.weather, condition: 'sunny' });
    expect(out.tireSettings.fl).toEqual({ before: 200, after: 210, diff: 10 });
    expect(out.tireSettings.rr).toEqual({ before: 180, after: 188, diff: 8 });
    expect(out.targetPressures).toEqual({ front: 200, rear: 190 });
    expect(out.sessionInfo).toEqual({ distance: 120, fuel: 30 });
    expect(out.suspensionSettings).toEqual(setup.suspensionSettings);
    expect(out.alignmentSettings).toEqual(setup.alignmentSettings);
    expect(out.brakeSettings).toEqual(setup.brakeSettings);
    expect(out.aeroSettings).toEqual(setup.aeroSettings);
    expect(out.engineSettings).toEqual(setup.engineSettings);
    expect(out.adjustmentValues).toEqual(setup.adjustmentValues);
    expect(out.notes).toBe('よく曲がる');
    expect(out.knowledge).toEqual(setup.knowledge);
  });

  it('ラップ・証憑・テレメトリ・共有設定が保全される（編集保存で消えない）', () => {
    const setup = fullSetup();
    const out = draftToSetupInput(setupToDraft(setup), 'user-1');

    expect(out.visibility).toBe('shared');
    expect(out.anonymized).toBe(true);
    expect(out.lapTimeData?.bestLap).toBe('1:58.423');
    expect(out.lapTimeData?.source).toBe('logger');
    expect(out.lapTimeData?.evidence?.fileName).toBe('run.csv');
    expect(out.telemetry).toEqual(setup.telemetry);
  });

  it('生成した保存ペイロードが Zod スキーマを通る', () => {
    const out = draftToSetupInput(setupToDraft(fullSetup()), 'user-1');
    const result = carSetupSchema.safeParse(out);
    expect(result.success).toBe(true);
  });
});

// ─── 未入力の扱い（0 変換・デモ値禁止） ───────────────────────────────────

describe('draftToSetupInput — 未入力は null（0 変換禁止・デモ値禁止）', () => {
  it('空の draft は数値をすべて null にする', () => {
    const out = draftToSetupInput(createEmptyDraft(), 'user-1');
    expect(out.weather.airTemp).toBeNull();
    expect(out.tireSettings.fl.before).toBeNull();
    expect(out.suspensionSettings?.frontDamper.compression).toBeNull();
    expect(out.alignmentSettings?.caster).toBeNull();
    expect(out.sessionInfo.distance).toBeNull();
  });

  it("'0' 入力は 0 として保存する（0→null 変換をしない）", () => {
    const d = createEmptyDraft();
    d.airTemp = '0';
    d.frontDamperCompression = 0;
    const out = draftToSetupInput(d, 'user-1');
    expect(out.weather.airTemp).toBe(0);
    expect(out.suspensionSettings?.frontDamper.compression).toBe(0);
  });

  it('未評価の drivingFeedback は undefined（デモ初期値を保存しない）', () => {
    const out = draftToSetupInput(createEmptyDraft(), 'user-1');
    expect(out.drivingFeedback).toBeUndefined();
  });

  it('1 項目でも評価すれば drivingFeedback を保存し、他は null のまま', () => {
    const d = createEmptyDraft();
    d.drivingFeedback = { ...emptyDrivingFeedback(), balance: 4 };
    const out = draftToSetupInput(d, 'user-1');
    expect(out.drivingFeedback?.balance).toBe(4);
    expect(out.drivingFeedback?.confidence).toBeNull();
  });

  it('全項目空の knowledge は undefined', () => {
    const out = draftToSetupInput(createEmptyDraft(), 'user-1');
    expect(out.knowledge).toBeUndefined();
  });

  it('タイヤ空気圧 diff は before/after から導出（片方 null なら null）', () => {
    const d = createEmptyDraft();
    d.tirePressures.fl = { before: '200', after: '210', diff: '' };
    d.tirePressures.fr = { before: '200', after: '', diff: '' };
    const out = draftToSetupInput(d, 'user-1');
    expect(out.tireSettings.fl.diff).toBe(10);
    expect(out.tireSettings.fr.diff).toBeNull();
  });

  it('driver が空白のみなら null で保存する', () => {
    const d = createEmptyDraft();
    d.driver = '   ';
    expect(draftToSetupInput(d, 'user-1').driver).toBeNull();
  });
});

// ─── copySetupToDraft ────────────────────────────────────────────────────

describe('copySetupToDraft', () => {
  it('設定値は引き継ぐが、距離・燃料・ラップ・証憑・テレメトリ・共有・日時は初期化する', () => {
    const setup = fullSetup();
    const before = Date.now();
    const draft = copySetupToDraft(setup);

    // 引き継ぐ
    expect(draft.carModel).toBe('Honda S2000');
    expect(draft.circuit).toBe('鈴鹿サーキット');
    expect(draft.tireBrand).toBe('ADVAN');
    expect(draft.frontSpringRate).toBe('12');
    expect(draft.frontCamber).toBe('-3');
    expect(draft.tirePressures.fl.before).toBe('200');
    expect(draft.targetPressures.front).toBe('200');

    // 初期化する（偽データ混入防止）
    expect(draft.bestLap).toBe('');
    expect(draft.totalLaps).toBe('');
    expect(draft.detailedLaps).toEqual([]);
    expect(draft.lapSource).toBe('manual');
    expect(draft.lapEvidence).toBeNull();
    expect(draft.telemetryRefs.traceIds).toEqual([]);
    expect(draft.telemetryRefs.importStatus).toBe('none');
    expect(draft.visibility).toBe('private');
    expect(draft.anonymized).toBe(false);
    expect(draft.distance).toBe('');
    expect(draft.fuel).toBe('');
    expect(draft.tireHeatCyclesAdded).toBe('');
    expect(draft.sessionDate.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('タイヤセットは引き継ぎ、使用回数だけを新しいセッションとして空にする', () => {
    const setup = fullSetup();
    setup.tireInfo.tireSetId = 'set-a';
    setup.tireInfo.tireSetCode = 'A050-01';
    setup.tireUsage = { heatCyclesAdded: 2 };
    const draft = copySetupToDraft(setup);
    expect(draft.tireSetId).toBe('set-a');
    expect(draft.tireSetCode).toBe('A050-01');
    expect(draft.tireHeatCyclesAdded).toBe('');
  });

  it('コピー後の保存ペイロードに共有状態・ロガー証憑が混入しない', () => {
    const out = draftToSetupInput(copySetupToDraft(fullSetup()), 'user-2');
    expect(out.visibility).toBe('private');
    expect(out.anonymized).toBe(false);
    expect(out.lapTimeData?.evidence).toBeNull();
    expect(out.lapTimeData?.source).toBe('manual');
    expect(out.telemetry?.traceIds).toEqual([]);
  });
});

// ─── inheritSetupSettings ────────────────────────────────────────────────

describe('inheritSetupSettings', () => {
  it('セッション非依存の設定だけを上書きし、セッション固有値は現 draft を保持する', () => {
    // 現在の draft: 天候・空気圧・ラップなどセッション固有値を入力済み
    const current: SetupDraft = {
      ...createEmptyDraft(),
      circuit: '富士スピードウェイ',
      airTemp: '18',
      bestLap: '2:05.000',
      tirePressures: {
        fl: { before: '190', after: '200', diff: '+10' },
        fr: { before: '', after: '', diff: '' },
        rl: { before: '', after: '', diff: '' },
        rr: { before: '', after: '', diff: '' },
      },
      distance: '50',
    };
    const next = inheritSetupSettings(current, fullSetup());

    // 引き継ぐ（セッション非依存）
    expect(next.tireBrand).toBe('ADVAN');
    expect(next.tireCompound).toBe('A050');
    expect(next.frontSpringRate).toBe('12');
    expect(next.frontDamperCompression).toBe(8);
    expect(next.frontCamber).toBe('-3');
    expect(next.caster).toBe('6');
    expect(next.driver).toBe('テストドライバー');

    // 引き継がない（セッション固有 = 現 draft を保持）
    expect(next.circuit).toBe('富士スピードウェイ');
    expect(next.airTemp).toBe('18');
    expect(next.bestLap).toBe('2:05.000');
    expect(next.tirePressures.fl.before).toBe('190');
    expect(next.distance).toBe('50');
    // 共有状態も引き継がない
    expect(next.visibility).toBe('private');
  });

  it('元の draft を変更しない（純粋関数）', () => {
    const current = createEmptyDraft();
    const snapshot = JSON.stringify(current);
    inheritSetupSettings(current, fullSetup());
    expect(JSON.stringify(current)).toBe(snapshot);
  });
});

// ─── 旧データ互換（欠損フィールド） ───────────────────────────────────────

describe('欠損フィールドを持つ旧データの読込', () => {
  it('suspension/alignment/targetPressures/drivingFeedback 欠損でも安全に変換する', () => {
    const legacy = fullSetup({
      suspensionSettings: undefined,
      alignmentSettings: undefined,
      targetPressures: undefined,
      drivingFeedback: undefined,
      lapTimeData: undefined,
      telemetry: undefined,
      visibility: undefined,
      anonymized: undefined,
    });
    const draft = setupToDraft(legacy);
    expect(draft.frontSpringRate).toBe('');
    expect(draft.frontCamber).toBe('');
    expect(draft.targetPressures.front).toBe('');
    expect(draft.visibility).toBe('private');
    expect(draft.lapSource).toBe('manual');
    expect(Object.values(draft.drivingFeedback).every((v) => v === null)).toBe(true);

    // 往復してもスキーマを通る
    const out = draftToSetupInput(draft, 'user-1');
    expect(carSetupSchema.safeParse(out).success).toBe(true);
  });
});
