import { describe, it, expect } from 'vitest';
import {
  displayValue,
  formatDelta,
  lapTimeToMs,
  compareBestLaps,
  pressureRange,
  compareRow,
  buildCompareSections,
  resolveCompareSections,
} from './setupFields';
import type { TFunction } from 'i18next';

const testT = ((key: string) => ({
  'compare.sections.weather': 'Weather',
  'compare.fields.weather': 'Weather condition',
  'compare.fields.airTemp': 'Air temperature',
  'common.sessionType.practice': 'Practice',
  'common.weather.sunny': 'Sunny',
}[key] ?? key)) as TFunction;

describe('resolveCompareSections', () => {
  it('固定の比較定義は表示文言ではなく翻訳キーを保持する', () => {
    const sections = buildCompareSections();
    expect(sections.every((section) => section.titleKey.startsWith('compare.sections.'))).toBe(true);
    expect(sections.flatMap((section) => section.rows).every((row) => row.labelKey?.startsWith('compare.fields.'))).toBe(true);
  });

  it('見出し・項目名・列挙値をtranslatorで解決する', () => {
    const setup = makeSetup({ sessionType: 'practice', weather: { condition: 'sunny', airTemp: 20, trackTemp: null, humidity: null, pressure: null } });
    const resolved = resolveCompareSections(buildCompareSections([setup]), testT);
    const weather = resolved.find((section) => section.titleKey === 'compare.sections.weather')!;
    expect(weather.title).toBe('Weather');
    expect(weather.rows.find((row) => row.labelKey === 'compare.fields.airTemp')?.label).toBe('Air temperature');
    expect(weather.rows.find((row) => row.labelKey === 'compare.fields.weather')?.get(setup)).toBe('Sunny');
    const session = resolved.find((section) => section.titleKey === 'compare.sections.session')!;
    expect(session.rows.find((row) => row.labelKey === 'compare.fields.sessionType')?.get(setup)).toBe('Practice');
  });
});
import { CarSetup } from '../types/setup';

function makeSetup(overrides: Partial<CarSetup> = {}): CarSetup {
  return {
    id: 'id1',
    userId: 'u1',
    driver: null,
    carModel: 'Honda S2000',
    circuit: '筑波サーキット',
    date: new Date(2026, 5, 13),
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
    createdAt: new Date(2026, 5, 13),
    updatedAt: new Date(2026, 5, 13),
    ...overrides,
  };
}

describe('displayValue', () => {
  it('null は「—」', () => {
    expect(displayValue(null)).toBe('—');
  });
  it('空文字は「—」', () => {
    expect(displayValue('')).toBe('—');
  });
  it('0 は「0」（偽値に潰さない）', () => {
    expect(displayValue(0)).toBe('0');
  });
  it('単位を付与する', () => {
    expect(displayValue(215, 'kPa')).toBe('215 kPa');
  });
});

describe('formatDelta', () => {
  it('正は + 付き', () => expect(formatDelta(5)).toBe('+5'));
  it('負はそのまま', () => expect(formatDelta(-3)).toBe('-3'));
  it('0 は ±0', () => expect(formatDelta(0)).toBe('±0'));
});

describe('lapTimeToMs', () => {
  it('M:SS.mmm を解析する', () => {
    expect(lapTimeToMs('1:58.423')).toBe(118423);
  });
  it('SS.mmm を解析する', () => {
    expect(lapTimeToMs('58.4')).toBe(58400);
  });
  it('解析不能は null', () => {
    expect(lapTimeToMs('abc')).toBeNull();
  });
  it('null は null', () => {
    expect(lapTimeToMs(null)).toBeNull();
  });
});

describe('compareBestLaps', () => {
  it('a が速い', () => {
    expect(compareBestLaps('1:58.000', '1:59.000')).toBe('a');
  });
  it('b が速い', () => {
    expect(compareBestLaps('2:01.000', '1:59.000')).toBe('b');
  });
  it('同値は null', () => {
    expect(compareBestLaps('1:58.000', '1:58.000')).toBeNull();
  });
  it('片方解析不能は null', () => {
    expect(compareBestLaps('1:58.000', null)).toBeNull();
  });
});

describe('pressureRange', () => {
  it('全 null は「—」', () => {
    expect(pressureRange(makeSetup(), 'front')).toBe('—');
  });
  it('単一値はその値', () => {
    const s = makeSetup({
      tireSettings: {
        fl: { before: null, after: 215 },
        fr: { before: null, after: 215 },
        rl: { before: null, after: null },
        rr: { before: null, after: null },
      },
    });
    expect(pressureRange(s, 'front')).toBe('215');
  });
  it('範囲表示', () => {
    const s = makeSetup({
      tireSettings: {
        fl: { before: null, after: 215 },
        fr: { before: null, after: 218 },
        rl: { before: null, after: 210 },
        rr: { before: null, after: 213 },
      },
    });
    expect(pressureRange(s, 'front')).toBe('215-218');
    expect(pressureRange(s, 'rear')).toBe('210-213');
  });
  it('片輪のみ値ありでも範囲を出す', () => {
    const s = makeSetup({
      tireSettings: {
        fl: { before: null, after: 215 },
        fr: { before: null, after: null },
        rl: { before: null, after: null },
        rr: { before: null, after: null },
      },
    });
    expect(pressureRange(s, 'front')).toBe('215');
  });
});

describe('compareRow', () => {
  const sections = buildCompareSections();
  const airTempRow = sections
    .find((s) => s.titleKey === 'compare.sections.weather')!
    .rows.find((r) => r.labelKey === 'compare.fields.airTemp')!;

  it('両者 null は both-null', () => {
    const r = compareRow(airTempRow, makeSetup(), makeSetup());
    expect(r.kind).toBe('both-null');
    expect(r.aDisplay).toBe('—');
    expect(r.bDisplay).toBe('—');
  });

  it('片方のみ値ありは only-a / only-b', () => {
    const a = makeSetup({ weather: { condition: null, airTemp: 24, trackTemp: null, humidity: null, pressure: null } });
    const b = makeSetup();
    const r = compareRow(airTempRow, a, b);
    expect(r.kind).toBe('only-a');
    expect(r.aDisplay).toBe('24 ℃');
    expect(r.bDisplay).toBe('—');
  });

  it('両者値ありで異なると changed + 差分', () => {
    const a = makeSetup({ weather: { condition: null, airTemp: 20, trackTemp: null, humidity: null, pressure: null } });
    const b = makeSetup({ weather: { condition: null, airTemp: 25, trackTemp: null, humidity: null, pressure: null } });
    const r = compareRow(airTempRow, a, b);
    expect(r.kind).toBe('changed');
    expect(r.delta).toBe(5);
  });

  it('両者同値は same', () => {
    const a = makeSetup({ weather: { condition: null, airTemp: 24, trackTemp: null, humidity: null, pressure: null } });
    const b = makeSetup({ weather: { condition: null, airTemp: 24, trackTemp: null, humidity: null, pressure: null } });
    const r = compareRow(airTempRow, a, b);
    expect(r.kind).toBe('same');
    expect(r.delta).toBe(0);
  });
});

describe('dynamic adjustment compare rows', () => {
  it('保存スナップショットから車両別セッティングを比較できる', () => {
    const adjustment = {
      definitionId: 'rear-damper',
      group: 'damper' as const,
      label: 'リア減衰力',
      position: 'rear' as const,
      valueType: 'number' as const,
      unit: 'click',
      value: 7,
    };
    const a = makeSetup({ adjustmentValues: [adjustment] });
    const b = makeSetup({ adjustmentValues: [{ ...adjustment, value: 10 }] });
    const section = buildCompareSections([a, b]).find((entry) => entry.titleKey === 'compare.sections.vehicleSpecific');
    const row = section?.rows[0];

    expect(row).toBeDefined();
    expect(compareRow(row!, a, b)).toMatchObject({
      aDisplay: '7 click',
      bDisplay: '10 click',
      kind: 'changed',
      delta: 3,
    });
  });
});
