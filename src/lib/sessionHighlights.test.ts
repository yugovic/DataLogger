// sessionHighlights.ts のユニットテスト
// 仕様書 WP-6 § 4 に記載の全ケースを網羅する

import { describe, expect, it } from 'vitest';
import {
  computeSessionHighlight,
  HIGHLIGHT_BADGE_LABELS,
  type HighlightBadge,
  type SessionHighlight,
} from './sessionHighlights';
import type { CarSetup } from '../types/setup';

// ─── テスト用ファクトリ ────────────────────────────────────

const makeSetup = (overrides: Partial<CarSetup> = {}): CarSetup => ({
  id: 'setup-1',
  userId: 'user-1',
  driver: null,
  carModel: 'Honda S2000',
  circuit: '筑波サーキット',
  date: new Date('2026-07-01T10:00:00'),
  sessionType: 'practice',
  weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null },
  tireSettings: {
    fl: { before: null, after: null },
    fr: { before: null, after: null },
    rl: { before: null, after: null },
    rr: { before: null, after: null },
  },
  tireInfo: { brand: '', compound: '' },
  sessionInfo: { distance: null, fuel: null },
  createdAt: new Date('2026-07-01T10:00:00'),
  updatedAt: new Date('2026-07-01T10:00:00'),
  ...overrides,
});

// ─── bestLap 無し → null ───────────────────────────────────

describe('bestLap が無い場合', () => {
  it('lapTimeData が undefined → null を返す', () => {
    const result = computeSessionHighlight(makeSetup(), []);
    expect(result).toBeNull();
  });

  it('lapTimeData.bestLap が null → null を返す', () => {
    const result = computeSessionHighlight(
      makeSetup({ lapTimeData: { bestLap: null } }),
      [],
    );
    expect(result).toBeNull();
  });

  it('lapTimeData.bestLap が空文字 → null を返す', () => {
    const result = computeSessionHighlight(
      makeSetup({ lapTimeData: { bestLap: '' } }),
      [],
    );
    expect(result).toBeNull();
  });

  it('lapTimeData.bestLap がパース不能な文字列 → null を返す', () => {
    const result = computeSessionHighlight(
      makeSetup({ lapTimeData: { bestLap: 'abc' } }),
      [],
    );
    expect(result).toBeNull();
  });
});

// ─── FIRST_VISIT ───────────────────────────────────────────

describe('FIRST_VISIT バッジ', () => {
  const current = makeSetup({ lapTimeData: { bestLap: '1:08.500' } });

  it('同サーキットの履歴がない → FIRST_VISIT を付与する', () => {
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result).not.toBeNull();
    expect(result.badges).toContain('FIRST_VISIT');
  });

  it('同サーキットの履歴がある → FIRST_VISIT を付与しない', () => {
    const past = makeSetup({ id: 'setup-past', lapTimeData: { bestLap: '1:09.000' } });
    const result = computeSessionHighlight(current, [past]) as SessionHighlight;
    expect(result.badges).not.toContain('FIRST_VISIT');
  });

  it('別サーキットのみ履歴にある → FIRST_VISIT を付与する', () => {
    const other = makeSetup({
      id: 'setup-other',
      circuit: '鈴鹿サーキット',
      lapTimeData: { bestLap: '2:05.000' },
    });
    const result = computeSessionHighlight(current, [other]) as SessionHighlight;
    expect(result.badges).toContain('FIRST_VISIT');
  });
});

// ─── SELF_BEST ─────────────────────────────────────────────

describe('SELF_BEST バッジ', () => {
  const fastCurrent = makeSetup({ lapTimeData: { bestLap: '1:07.000' } });
  const slowCurrent = makeSetup({ lapTimeData: { bestLap: '1:10.000' } });
  const pastRecord = makeSetup({ id: 'setup-past', lapTimeData: { bestLap: '1:08.500' } });

  it('過去ベストより速い → SELF_BEST を付与する', () => {
    const result = computeSessionHighlight(fastCurrent, [pastRecord]) as SessionHighlight;
    expect(result.badges).toContain('SELF_BEST');
  });

  it('過去ベストより遅い → SELF_BEST を付与しない', () => {
    const result = computeSessionHighlight(slowCurrent, [pastRecord]) as SessionHighlight;
    expect(result.badges).not.toContain('SELF_BEST');
  });

  it('過去に有効なラップタイムが 0 件 → SELF_BEST を付与しない', () => {
    const pastNoLap = makeSetup({ id: 'setup-past-nolap', lapTimeData: { bestLap: null } });
    const result = computeSessionHighlight(fastCurrent, [pastNoLap]) as SessionHighlight;
    expect(result.badges).not.toContain('SELF_BEST');
  });

  it('FIRST_VISIT のとき（同サーキット履歴 0 件）は SELF_BEST を付与しない', () => {
    // 初走行で「自己ベスト更新」は自明なので付与しない
    const result = computeSessionHighlight(fastCurrent, []) as SessionHighlight;
    expect(result.badges).toContain('FIRST_VISIT');
    expect(result.badges).not.toContain('SELF_BEST');
  });
});

// ─── vehicleId 優先の車両対応付け ──────────────────────────

describe('SELF_BEST — vehicleId 優先の車両対応付け', () => {
  it('vehicleId が一致する場合 → 同車両として比較する', () => {
    const current = makeSetup({
      vehicleId: 'v-1',
      lapTimeData: { bestLap: '1:07.000' },
    });
    const past = makeSetup({
      id: 'setup-past',
      vehicleId: 'v-1',
      lapTimeData: { bestLap: '1:08.500' },
    });
    const result = computeSessionHighlight(current, [past]) as SessionHighlight;
    expect(result.badges).toContain('SELF_BEST');
  });

  it('vehicleId が不一致 → carModel が同じでも別車両として扱う（SELF_BEST なし）', () => {
    const current = makeSetup({
      carModel: 'Honda S2000',
      vehicleId: 'v-1',
      lapTimeData: { bestLap: '1:07.000' },
    });
    const past = makeSetup({
      id: 'setup-past',
      carModel: 'Honda S2000',
      vehicleId: 'v-2', // vehicleId 不一致
      lapTimeData: { bestLap: '1:08.500' },
    });
    const result = computeSessionHighlight(current, [past]) as SessionHighlight;
    expect(result.badges).not.toContain('SELF_BEST');
  });

  it('vehicleId なし同士は carModel で比較する', () => {
    const current = makeSetup({
      vehicleId: null,
      carModel: 'Honda S2000',
      lapTimeData: { bestLap: '1:07.000' },
    });
    const past = makeSetup({
      id: 'setup-past',
      vehicleId: null,
      carModel: 'Honda S2000',
      lapTimeData: { bestLap: '1:08.500' },
    });
    const result = computeSessionHighlight(current, [past]) as SessionHighlight;
    expect(result.badges).toContain('SELF_BEST');
  });

  it('current に vehicleId あり・past は vehicleId なし → 別車両として扱う', () => {
    const current = makeSetup({
      vehicleId: 'v-1',
      carModel: 'Honda S2000',
      lapTimeData: { bestLap: '1:07.000' },
    });
    const past = makeSetup({
      id: 'setup-past',
      vehicleId: null,
      carModel: 'Honda S2000',
      lapTimeData: { bestLap: '1:08.500' },
    });
    const result = computeSessionHighlight(current, [past]) as SessionHighlight;
    expect(result.badges).not.toContain('SELF_BEST');
  });
});

// ─── FIRST_LOGGER ──────────────────────────────────────────

describe('FIRST_LOGGER バッジ', () => {
  const evidence = {
    fileName: 'session.csv',
    format: 'aim-csv' as const,
    importedAt: new Date('2026-07-01T10:00:00'),
    trackId: null,
  };

  it('current に証憑あり・履歴に証憑なし → FIRST_LOGGER を付与する', () => {
    const current = makeSetup({
      lapTimeData: { bestLap: '1:08.500', source: 'logger', evidence },
    });
    const pastNoEvidence = makeSetup({ id: 'past-1', lapTimeData: { bestLap: '1:09.000' } });
    const result = computeSessionHighlight(current, [pastNoEvidence]) as SessionHighlight;
    expect(result.badges).toContain('FIRST_LOGGER');
  });

  it('current に証憑あり・履歴にも証憑あり → FIRST_LOGGER を付与しない', () => {
    const current = makeSetup({
      lapTimeData: { bestLap: '1:08.500', source: 'logger', evidence },
    });
    const pastWithEvidence = makeSetup({
      id: 'past-1',
      lapTimeData: { bestLap: '1:09.000', source: 'logger', evidence },
    });
    const result = computeSessionHighlight(current, [pastWithEvidence]) as SessionHighlight;
    expect(result.badges).not.toContain('FIRST_LOGGER');
  });

  it('current に証憑なし → FIRST_LOGGER を付与しない', () => {
    const current = makeSetup({ lapTimeData: { bestLap: '1:08.500' } });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.badges).not.toContain('FIRST_LOGGER');
  });
});

// ─── RAIN_SESSION ──────────────────────────────────────────

describe('RAIN_SESSION バッジ', () => {
  it("condition='ウェット' → RAIN_SESSION を付与する", () => {
    const current = makeSetup({
      weather: { condition: 'ウェット', airTemp: null, trackTemp: null, humidity: null, pressure: null },
      lapTimeData: { bestLap: '1:12.000' },
    });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.badges).toContain('RAIN_SESSION');
  });

  it("condition='フルウェット' → RAIN_SESSION を付与する", () => {
    const current = makeSetup({
      weather: { condition: 'フルウェット', airTemp: null, trackTemp: null, humidity: null, pressure: null },
      lapTimeData: { bestLap: '1:15.000' },
    });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.badges).toContain('RAIN_SESSION');
  });

  it('condition が null → RAIN_SESSION を付与しない', () => {
    const current = makeSetup({
      weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null },
      lapTimeData: { bestLap: '1:08.500' },
    });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.badges).not.toContain('RAIN_SESSION');
  });

  it("condition='晴れ' → RAIN_SESSION を付与しない", () => {
    const current = makeSetup({
      weather: { condition: '晴れ', airTemp: null, trackTemp: null, humidity: null, pressure: null },
      lapTimeData: { bestLap: '1:08.500' },
    });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.badges).not.toContain('RAIN_SESSION');
  });
});

// ─── SessionHighlight フィールドの検証 ────────────────────

describe('SessionHighlight の返却値', () => {
  it('circuit / carModel / sessionDate / bestLap / lapCount が正しく入る', () => {
    const current = makeSetup({
      circuit: '富士スピードウェイ',
      carModel: 'Toyota GR86',
      date: new Date('2026-07-01T09:00:00'),
      lapTimeData: { bestLap: '1:55.123', totalLaps: 12 },
    });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.circuit).toBe('富士スピードウェイ');
    expect(result.carModel).toBe('Toyota GR86');
    expect(result.sessionDate).toEqual(new Date('2026-07-01T09:00:00'));
    expect(result.bestLap).toBe('1:55.123');
    expect(result.lapCount).toBe(12);
  });

  it('totalLaps が null の場合 lapCount は null になる', () => {
    const current = makeSetup({ lapTimeData: { bestLap: '1:08.500', totalLaps: null } });
    const result = computeSessionHighlight(current, []) as SessionHighlight;
    expect(result.lapCount).toBeNull();
  });
});

// ─── HIGHLIGHT_BADGE_LABELS の網羅確認 ────────────────────

describe('HIGHLIGHT_BADGE_LABELS', () => {
  const allBadges: HighlightBadge[] = ['FIRST_VISIT', 'SELF_BEST', 'FIRST_LOGGER', 'RAIN_SESSION'];

  it('全バッジに対して日本語ラベルが定義されている', () => {
    for (const badge of allBadges) {
      expect(HIGHLIGHT_BADGE_LABELS[badge]).toBeTruthy();
      expect(typeof HIGHLIGHT_BADGE_LABELS[badge]).toBe('string');
    }
  });

  it('ラベルの内容が仕様書どおりであること', () => {
    expect(HIGHLIGHT_BADGE_LABELS.FIRST_VISIT).toBe('初走行');
    expect(HIGHLIGHT_BADGE_LABELS.SELF_BEST).toBe('自己ベスト更新');
    expect(HIGHLIGHT_BADGE_LABELS.FIRST_LOGGER).toBe('初ロガー計測');
    expect(HIGHLIGHT_BADGE_LABELS.RAIN_SESSION).toBe('雨天走行');
  });
});
