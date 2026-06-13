// NMEA RMC パーサーのテスト — チェックサム・日跨ぎ・座標変換・単位変換・異常系

import { describe, expect, it } from 'vitest';
import { parseNmeaRmc } from './parseNmeaRmc';
import { TelemetryParseError } from './types';

/** テスト用: ペイロードに正しいチェックサムを付けてセンテンス化する */
function sentence(payload: string): string {
  let checksum = 0;
  for (let i = 0; i < payload.length; i++) checksum ^= payload.charCodeAt(i);
  return `$${payload}*${checksum.toString(16).toUpperCase().padStart(2, '0')}`;
}

/** テスト用: RMC センテンスを組み立てる */
function rmc(opts: {
  talker?: 'GP' | 'GN';
  time: string;
  status?: string;
  lat?: string;
  ns?: string;
  lon?: string;
  ew?: string;
  knots?: string;
  course?: string;
  date?: string;
}): string {
  const {
    talker = 'GP',
    time,
    status = 'A',
    lat = '3450.6876',
    ns = 'N',
    lon = '13632.3320',
    ew = 'E',
    knots = '98.3',
    course = '138.8',
    date = '131212',
  } = opts;
  return sentence(`${talker}RMC,${time},${status},${lat},${ns},${lon},${ew},${knots},${course},${date},,,A`);
}

describe('parseNmeaRmc — 正常系', () => {
  it('GPRMC を座標・速度・方位つきでパースする', () => {
    const text = [rmc({ time: '105937.00' }), rmc({ time: '105938.00' })].join('\n');
    const session = parseNmeaRmc(text);

    expect(session.points).toHaveLength(2);
    expect(session.meta.format).toBe('nmea');
    // ddmm.mmmm → 度: 3450.6876 = 34° + 50.6876/60 = 34.844793...
    expect(session.points[0].lat).toBeCloseTo(34 + 50.6876 / 60, 9);
    expect(session.points[0].lon).toBeCloseTo(136 + 32.332 / 60, 9);
    // ノット → km/h
    expect(session.points[0].speed).toBeCloseTo(98.3 * 1.852, 9);
    expect(session.points[0].heading).toBeCloseTo(138.8, 9);
    expect(session.points[0].altitude).toBeNull(); // RMC に高度は無い
    // 経過秒は先頭 0 起点
    expect(session.points[0].time).toBe(0);
    expect(session.points[1].time).toBeCloseTo(1, 9);
  });

  it('GNRMC（GNSS 混合）も受理する', () => {
    const text = [rmc({ talker: 'GN', time: '120000.00' }), rmc({ talker: 'GN', time: '120000.50' })].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points).toHaveLength(2);
    expect(session.meta.sampleRateHz).toBe(2);
  });

  it('南緯・西経は負値になる', () => {
    const text = [
      rmc({ time: '000001.00', lat: '3000.0000', ns: 'S', lon: '05130.0000', ew: 'W' }),
      rmc({ time: '000002.00', lat: '3000.0000', ns: 'S', lon: '05130.0000', ew: 'W' }),
    ].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points[0].lat).toBeCloseTo(-30.0, 9);
    expect(session.points[0].lon).toBeCloseTo(-51.5, 9);
  });

  it('日跨ぎ（23:59:59 → 00:00:01）で経過秒が単調増加を保つ', () => {
    const text = [
      rmc({ time: '235959.00', date: '131212' }),
      rmc({ time: '000001.00', date: '141212' }),
      rmc({ time: '000003.00', date: '141212' }),
    ].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points.map((p) => p.time)).toEqual([0, 2, 4]);
  });

  it('日付フィールドから開始時刻（UTC 解釈）を組み立てる', () => {
    const text = [rmc({ time: '105937.00', date: '131212' }), rmc({ time: '105938.00', date: '131212' })].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.meta.startTimestamp?.toISOString()).toBe('2012-12-13T10:59:37.000Z');
  });

  it('針路が空のセンテンス（停止中）は heading=null になる（0 への変換禁止）', () => {
    const text = [
      sentence('GPRMC,100000.00,A,3450.6876,N,13632.3320,E,0.0,,131212,,,A'),
      sentence('GPRMC,100001.00,A,3450.6876,N,13632.3320,E,0.0,,131212,,,A'),
    ].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points[0].heading).toBeNull();
    expect(session.points[0].speed).toBe(0);
  });
});

describe('parseNmeaRmc — 異常系・防御', () => {
  it('空ファイルは明確なエラーで失敗する', () => {
    expect(() => parseNmeaRmc('')).toThrow(TelemetryParseError);
    expect(() => parseNmeaRmc('  \n ')).toThrow(/空のファイル/);
  });

  it('RMC センテンスが1行も無いテキストは失敗する', () => {
    expect(() => parseNmeaRmc('hello\nworld\n$GPGGA,xxx*00')).toThrow(/センテンスが見つかりません/);
  });

  it('チェックサム不正のセンテンスはスキップされ、件数が記録される', () => {
    const good1 = rmc({ time: '100000.00' });
    const good2 = rmc({ time: '100001.00' });
    const bad = good1.slice(0, -2) + 'FF'; // チェックサム改竄
    const session = parseNmeaRmc([good1, bad, good2].join('\n'));
    expect(session.points).toHaveLength(2);
    expect(session.meta.extra.ChecksumErrors).toBe('1');
  });

  it('ステータス V（無効測位）のセンテンスはスキップされる', () => {
    const text = [
      rmc({ time: '100000.00' }),
      rmc({ time: '100001.00', status: 'V' }),
      rmc({ time: '100002.00' }),
    ].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points).toHaveLength(2);
    expect(session.meta.extra.InvalidFixes).toBe('1');
  });

  it('有効な測位が2点未満なら理由つきで失敗する', () => {
    const single = rmc({ time: '100000.00' });
    expect(() => parseNmeaRmc(single)).toThrow(/有効な測位が2点未満/);
  });

  it('分が60以上の不正座標はスキップされる', () => {
    const text = [
      rmc({ time: '100000.00' }),
      rmc({ time: '100001.00', lat: '3475.0000' }), // 75分 = 不正
      rmc({ time: '100002.00' }),
    ].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points).toHaveLength(2);
    expect(session.meta.extra.MalformedSentences).toBe('1');
  });

  it('同時刻の重複センテンスはスキップされる', () => {
    const text = [rmc({ time: '100000.00' }), rmc({ time: '100000.00' }), rmc({ time: '100001.00' })].join('\n');
    const session = parseNmeaRmc(text);
    expect(session.points).toHaveLength(2);
  });
});
