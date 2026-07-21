import { describe, it, expect } from 'vitest';
import {
  buildDuplicatePreview,
  buildInheritPreview,
  formatLoadPreviewDate,
} from './setupLoadPreview';
import type { CarSetup } from '../types/setup';

// 最小構成の CarSetup を作るヘルパー（テスト対象カテゴリだけ上書きする）
const makeSetup = (overrides: Partial<CarSetup> = {}): CarSetup =>
  ({
    id: 's1',
    userId: 'u1',
    carModel: 'Toyota GR86',
    circuit: '鈴鹿サーキット',
    driver: 'テスト太郎',
    date: new Date('2026-07-19T14:30:00'),
    sessionType: 'practice',
    weather: { condition: null, airTemp: null, trackTemp: null, humidity: null, pressure: null },
    tireInfo: { brand: '', compound: '' },
    tireSettings: {
      fl: { before: null, after: null, diff: null },
      fr: { before: null, after: null, diff: null },
      rl: { before: null, after: null, diff: null },
      rr: { before: null, after: null, diff: null },
    },
    targetPressures: { front: null, rear: null },
    sessionInfo: { distance: null, fuel: null },
    suspensionSettings: {
      frontDamper: { compression: null, rebound: null },
      rearDamper: { compression: null, rebound: null },
      springRate: { front: null, rear: null },
      rideHeight: { front: null, rear: null },
      antiRollBar: { front: null, rear: null },
    },
    alignmentSettings: {
      camber: { front: null, rear: null },
      toe: { front: null, rear: null },
      caster: null,
    },
    lapTimeData: { bestLap: null, totalLaps: null, laps: [], source: 'manual', evidence: null },
    telemetry: { traceIds: [], primaryTraceId: null, importStatus: 'none' },
    visibility: 'private',
    anonymized: false,
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as CarSetup;

describe('formatLoadPreviewDate', () => {
  it('Date を日付＋時刻の文字列に整形する', () => {
    const label = formatLoadPreviewDate(new Date('2026-07-19T14:30:00'), 'ja-JP');
    expect(label).toContain('2026');
    expect(label).toMatch(/14:30/);
  });

  it('Date でない値（文字列）も受け付ける', () => {
    expect(() => formatLoadPreviewDate('2026-07-19T14:30:00' as unknown as Date, 'ja-JP')).not.toThrow();
  });
});

describe('buildDuplicatePreview', () => {
  it('車種・サーキット・日時を提示する', () => {
    const p = buildDuplicatePreview(makeSetup(), 'ja-JP');
    expect(p.carModel).toBe('Toyota GR86');
    expect(p.circuit).toBe('鈴鹿サーキット');
    expect(p.dateLabel).toContain('2026');
  });

  it('コピー元が空なら車種・サーキットは null（表示側でプレースホルダを t() する）', () => {
    const p = buildDuplicatePreview(makeSetup({ carModel: '', circuit: '' }), 'ja-JP');
    expect(p.carModel).toBeNull();
    expect(p.circuit).toBeNull();
  });

  it('値のあるカテゴリを filled=true として示す', () => {
    const p = buildDuplicatePreview(
      makeSetup({
        tireInfo: { brand: 'ADVAN', compound: 'A050' },
        suspensionSettings: {
          frontDamper: { compression: 10, rebound: null },
          rearDamper: { compression: null, rebound: null },
          springRate: { front: null, rear: null },
          rideHeight: { front: null, rear: null },
          antiRollBar: { front: null, rear: null },
        },
      }),
      'ja-JP',
    );
    const tire = p.copiedItems.find((i) => i.labelKey === 'setup.preview.items.tireInfo');
    const damper = p.copiedItems.find((i) => i.labelKey === 'setup.preview.items.damper');
    const align = p.copiedItems.find((i) => i.labelKey === 'setup.preview.items.alignment');
    expect(tire?.filled).toBe(true);
    expect(damper?.filled).toBe(true);
    expect(align?.filled).toBe(false);
  });

  it('リセットされる項目にラップ・証憑・共有状態・日時を含む', () => {
    const p = buildDuplicatePreview(makeSetup(), 'ja-JP');
    expect(p.resetItems).toContain('setup.preview.reset.lapTime');
    expect(p.resetItems).toContain('setup.preview.reset.evidence');
    expect(p.resetItems).toContain('setup.preview.reset.shareState');
  });
});

describe('buildInheritPreview', () => {
  it('セッション非依存の対象項目だけを列挙する', () => {
    const p = buildInheritPreview(makeSetup({ tireInfo: { brand: 'ADVAN', compound: 'A050' } }), 'ja-JP');
    const keys = p.inheritedItems.map((i) => i.labelKey);
    expect(keys).toContain('setup.preview.items.tireBrandCompound');
    expect(keys).toContain('setup.preview.items.damper');
    expect(keys).toContain('setup.preview.items.alignment');
    // 空気圧の実測値やラップは引き継がない旨を keptItems に含む
    expect(p.keptItems).toContain('setup.preview.kept.measuredPressure');
    expect(p.keptItems).toContain('setup.preview.kept.lapTime');
  });

  it('タイヤ情報の有無を filled で示す', () => {
    const withTire = buildInheritPreview(makeSetup({ tireInfo: { brand: 'ADVAN', compound: '' } }), 'ja-JP');
    const withoutTire = buildInheritPreview(makeSetup({ tireInfo: { brand: '', compound: '' } }), 'ja-JP');
    const key = 'setup.preview.items.tireBrandCompound';
    expect(withTire.inheritedItems.find((i) => i.labelKey === key)?.filled).toBe(true);
    expect(withoutTire.inheritedItems.find((i) => i.labelKey === key)?.filled).toBe(false);
  });
});
