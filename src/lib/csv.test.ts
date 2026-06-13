import { describe, it, expect } from 'vitest';
import { escapeCsvCell, setupsToCsv, csvFileName } from './csv';
import { CarSetup } from '../types/setup';

// 最小限の有効な CarSetup を生成するヘルパー（null フィールドは null のまま）
function makeSetup(overrides: Partial<CarSetup> = {}): CarSetup {
  return {
    id: 'id1',
    userId: 'u1',
    driver: null,
    carModel: 'Honda S2000',
    circuit: '筑波サーキット',
    date: new Date(2026, 5, 13, 14, 30), // 2026-06-13 14:30 ローカル
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

describe('escapeCsvCell', () => {
  it('null は空文字を返す（0 にしない）', () => {
    expect(escapeCsvCell(null)).toBe('');
  });

  it('undefined は空文字を返す', () => {
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('0 は "0" を返す（正当な 0 は保持）', () => {
    expect(escapeCsvCell(0)).toBe('0');
  });

  it('カンマを含む値はダブルクォートで囲む', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });

  it('ダブルクォートを含む値は "" にエスケープして囲む', () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });

  it('改行を含む値はダブルクォートで囲む', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('setupsToCsv', () => {
  it('UTF-8 BOM で始まる', () => {
    const csv = setupsToCsv([makeSetup()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('ヘッダー行に単位が併記されている', () => {
    const csv = setupsToCsv([]);
    expect(csv).toContain('気温(℃)');
    expect(csv).toContain('FL空気圧前(kPa)');
    expect(csv).toContain('Fバネレート(kgf/mm)');
  });

  it('null フィールドは空セルになる（0 に変換しない）', () => {
    const csv = setupsToCsv([makeSetup()]);
    const lines = csv.replace('﻿', '').split('\r\n');
    const dataRow = lines[1];
    // 日付・サーキット・車種・セッション種別以外はすべて空セル。
    // 空気圧前後・気温などが "0" になっていないことを確認する。
    const cells = dataRow.split(',');
    // 気温セル（index 6）は空
    expect(cells[6]).toBe('');
    // FL空気圧前（index 10）は空
    expect(cells[10]).toBe('');
    // CSV 全体に "0" という独立セルが現れない
    expect(dataRow).not.toMatch(/,0,/);
  });

  it('値が入っている場合は数値が出力される（0 含む）', () => {
    const setup = makeSetup({
      weather: { condition: '晴れ', airTemp: 0, trackTemp: 33, humidity: 50, pressure: 1013 },
      tireSettings: {
        fl: { before: 200, after: 215 },
        fr: { before: 200, after: 215 },
        rl: { before: 190, after: 210 },
        rr: { before: 190, after: 210 },
      },
      lapTimeData: { bestLap: '1:58.423', totalLaps: 12, laps: [] },
    });
    const csv = setupsToCsv([setup]);
    expect(csv).toContain('晴れ');
    expect(csv).toContain('1:58.423');
    expect(csv).toContain('215');
    // 気温 0 は "0" として保持される（空セルにしない）
    const dataRow = csv.replace('﻿', '').split('\r\n')[1];
    const cells = dataRow.split(',');
    expect(cells[6]).toBe('0');
  });

  it('複数行を CRLF で連結する', () => {
    const csv = setupsToCsv([makeSetup(), makeSetup({ id: 'id2' })]);
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines.length).toBe(3); // ヘッダー + 2行
  });

  it('セッション種別が日本語ラベルになる', () => {
    const csv = setupsToCsv([makeSetup({ sessionType: 'race' })]);
    expect(csv).toContain('レース');
  });

  it('メモ内のカンマ・改行が安全にエスケープされる', () => {
    const csv = setupsToCsv([makeSetup({ notes: 'アンダー強い, 様子見\n次回調整' })]);
    expect(csv).toContain('"アンダー強い, 様子見\n次回調整"');
  });
});

describe('csvFileName', () => {
  it('velocity-logger-export-YYYYMMDD.csv 形式', () => {
    expect(csvFileName(new Date(2026, 5, 13))).toBe('velocity-logger-export-20260613.csv');
  });
});
