// AIM CSV パーサーのテスト — メタデータ・列ゆらぎ・欠損列・異常系

import { describe, expect, it } from 'vitest';
import { parseAimCsv } from './parseAimCsv';
import { TelemetryParseError } from './types';

/** テスト用: 標準的な AIM CSV（Race Studio エクスポート風）を生成する */
function buildStandardCsv(): string {
  const lines = [
    '"Format","AIM CSV File"',
    '"Venue","Tsukuba Circuit"',
    '"Date","2026/06/03"',
    '"Time","10:30:00"',
    '"Sample Rate",10',
    '"Segment","Session1"',
    '"Time","GPS_Speed","GPS_Latitude","GPS_Longitude","GPS_Heading","RPM"',
    '"s","km/h","deg","deg","deg","rpm"',
  ];
  for (let i = 0; i < 20; i++) {
    const t = i / 10;
    lines.push(`${t.toFixed(2)},${(100 + i).toFixed(1)},36.1510${i % 10},139.9200${i % 10},90.0,5000`);
  }
  return lines.join('\n');
}

describe('parseAimCsv — 正常系', () => {
  it('メタデータ・チャネル・データ行をパースする', () => {
    const session = parseAimCsv(buildStandardCsv());
    expect(session.meta.format).toBe('aim-csv');
    expect(session.meta.extra.Venue).toBe('Tsukuba Circuit');
    expect(session.meta.sampleRateHz).toBe(10); // メタの Sample Rate を優先
    expect(session.points).toHaveLength(20);
    expect(session.points[0].time).toBe(0);
    expect(session.points[1].time).toBeCloseTo(0.1, 9);
    expect(session.points[0].speed).toBeCloseTo(100, 9);
    expect(session.points[0].lat).toBeCloseTo(36.15100, 6);
    expect(session.points[0].heading).toBeCloseTo(90, 9);
  });

  it('Date/Time メタを JST として開始時刻に変換する', () => {
    const session = parseAimCsv(buildStandardCsv());
    // 2026/06/03 10:30:00 JST = 01:30:00 UTC
    expect(session.meta.startTimestamp?.toISOString()).toBe('2026-06-03T01:30:00.000Z');
  });

  it('列名ゆらぎ: "GPS Speed" / "Latitude" / "Longitude" でも認識する', () => {
    const csv = [
      '"Time","GPS Speed","Latitude","Longitude"',
      '"s","km/h","deg","deg"',
      '0.0,100.0,36.15,139.92',
      '0.1,101.0,36.16,139.93',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.points).toHaveLength(2);
    expect(session.points[1].speed).toBeCloseTo(101, 9);
    expect(session.points[1].lat).toBeCloseTo(36.16, 9);
  });

  it('単位 km/h を持つ "Speed" 列も速度として認識する', () => {
    const csv = [
      '"Time","Speed","Latitude","Longitude"',
      '"s","km/h","deg","deg"',
      '0.0,100.0,36.15,139.92',
      '0.1,101.0,36.16,139.93',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.points[0].speed).toBeCloseTo(100, 9);
  });

  it('GPS 列が無い場合は lat/lon が null になる（0 への変換禁止）', () => {
    const csv = [
      '"Time","GPS_Speed","RPM","WaterTemp"',
      '"s","km/h","rpm","C"',
      '0.0,100.0,5000,80',
      '0.1,101.0,5100,80',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.points[0].lat).toBeNull();
    expect(session.points[0].lon).toBeNull();
    expect(session.points[0].heading).toBeNull();
  });

  it('速度列が無い場合は GPS から速度を導出する', () => {
    // 緯度 0.0001° ≒ 11.13m を 1 秒で移動 → 約 40 km/h
    const csv = [
      '"Time","GPS_Latitude","GPS_Longitude","RPM"',
      '"s","deg","deg","rpm"',
      '0.0,36.0000,139.9200,5000',
      '1.0,36.0001,139.9200,5000',
      '2.0,36.0002,139.9200,5000',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.meta.extra.SpeedDerivedFromGps).toBe('true');
    expect(session.points).toHaveLength(2); // 先頭行は速度を導出できないため除外
    expect(session.points[0].speed).toBeCloseTo(0.0001 * 111320 * 3.6, 0);
  });

  it('単位行が欠落したエクスポートにも対応する', () => {
    const csv = [
      '"Time","GPS_Speed","GPS_Latitude","GPS_Longitude"',
      '0.0,100.0,36.15,139.92',
      '0.1,101.0,36.16,139.93',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.points).toHaveLength(2);
    expect(session.points[0].speed).toBeCloseTo(100, 9);
  });

  it('速度セルが欠損した行はスキップされる（0 充填しない）', () => {
    const csv = [
      '"Time","GPS_Speed","GPS_Latitude","GPS_Longitude"',
      '"s","km/h","deg","deg"',
      '0.0,100.0,36.15,139.92',
      '0.1,,36.16,139.93',
      '0.2,102.0,36.17,139.94',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.points).toHaveLength(2);
    expect(session.points.map((p) => p.speed)).toEqual([100, 102]);
  });

  it('時刻が逆行する行はスキップされる', () => {
    const csv = [
      '"Time","GPS_Speed","GPS_Latitude","GPS_Longitude"',
      '"s","km/h","deg","deg"',
      '0.0,100.0,36.15,139.92',
      '0.1,101.0,36.16,139.93',
      '0.05,999.0,36.17,139.94', // 逆行
      '0.2,102.0,36.18,139.95',
    ].join('\n');
    const session = parseAimCsv(csv);
    expect(session.points).toHaveLength(3);
    expect(session.points.every((p) => p.speed < 999)).toBe(true);
  });
});

describe('parseAimCsv — 異常系', () => {
  it('空ファイルは明確なエラーで失敗する', () => {
    expect(() => parseAimCsv('')).toThrow(TelemetryParseError);
    expect(() => parseAimCsv('  \n ')).toThrow(/空のファイル/);
  });

  it('ヘッダ行が見つからないテキストは失敗する', () => {
    expect(() => parseAimCsv('hello world\nfoo bar')).toThrow(/チャネル名行.*見つかりません/);
  });

  it('Time 列が無い CSV は検出列名つきで失敗する', () => {
    const csv = ['"Speed","Lat","Lon","RPM"', '"km/h","deg","deg","rpm"', '100,36,139,5000'].join('\n');
    expect(() => parseAimCsv(csv)).toThrow(/Time 列が見つかりません/);
  });

  it('速度列も GPS 列も無い CSV は失敗する', () => {
    const csv = ['"Time","RPM","WaterTemp","OilTemp"', '"s","rpm","C","C"', '0.0,5000,80,90', '0.1,5100,80,90'].join('\n');
    expect(() => parseAimCsv(csv)).toThrow(/速度列も GPS 座標列も無い/);
  });

  it('データ行が2行未満なら失敗する', () => {
    const csv = ['"Time","GPS_Speed","GPS_Latitude","GPS_Longitude"', '"s","km/h","deg","deg"', '0.0,100.0,36.15,139.92'].join('\n');
    expect(() => parseAimCsv(csv)).toThrow(/2行未満/);
  });
});
