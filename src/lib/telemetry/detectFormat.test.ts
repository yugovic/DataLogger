// フォーマット自動判別とルーティングのテスト

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectFormat, parseTelemetryFile } from './detectFormat';
import { TelemetryParseError } from './types';

const SAMPLE_PATH = fileURLToPath(
  new URL('../../components/demo/SampleData/amuse_Z34_Ooi_0013_2_21_711.dtb', import.meta.url),
);

function loadSample(): ArrayBuffer {
  const buf = readFileSync(SAMPLE_PATH);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function toBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(0, bytes.byteLength) as ArrayBuffer;
}

/** チェックサムつき RMC センテンス */
function rmcSentence(time: string): string {
  const payload = `GPRMC,${time},A,3450.6876,N,13632.3320,E,98.3,138.8,131212,,,A`;
  let checksum = 0;
  for (let i = 0; i < payload.length; i++) checksum ^= payload.charCodeAt(i);
  return `$${payload}*${checksum.toString(16).toUpperCase().padStart(2, '0')}`;
}

const NMEA_TEXT = [rmcSentence('100000.00'), rmcSentence('100001.00')].join('\n');

const AIM_TEXT = [
  '"Format","AIM CSV File"',
  '"Venue","Suzuka"',
  '"Time","GPS_Speed","GPS_Latitude","GPS_Longitude"',
  '"s","km/h","deg","deg"',
  '0.0,100.0,34.84,136.53',
  '0.1,101.0,34.85,136.54',
].join('\n');

describe('detectFormat', () => {
  it('実 .dtb バイナリを digispice-dtb と判別する', () => {
    expect(detectFormat('amuse_Z34_Ooi_0013_2_21_711.dtb', loadSample())).toBe('digispice-dtb');
  });

  it('拡張子が .dtb 以外でも .dtb バイナリ構造なら digispice-dtb と判別する', () => {
    expect(detectFormat('session.bin', loadSample())).toBe('digispice-dtb');
  });

  it('NMEA テキストを nmea と判別する（拡張子 .txt / .log を問わず）', () => {
    expect(detectFormat('digispice_log.txt', toBuffer(NMEA_TEXT))).toBe('nmea');
    expect(detectFormat('session.log', toBuffer(NMEA_TEXT))).toBe('nmea');
  });

  it('AIM CSV を aim-csv と判別する', () => {
    expect(detectFormat('export.csv', toBuffer(AIM_TEXT))).toBe('aim-csv');
  });

  it('拡張子 .dtb なのに中身がテキストの場合は明確なエラー', () => {
    expect(() => detectFormat('fake.dtb', toBuffer(NMEA_TEXT))).toThrow(TelemetryParseError);
    expect(() => detectFormat('fake.dtb', toBuffer(NMEA_TEXT))).toThrow(/拡張子は \.dtb ですが/);
  });

  it('判別不能なデータはエラーになる', () => {
    expect(() => detectFormat('unknown.xyz', toBuffer('hello world\nfoo'))).toThrow(/いずれとも判別できません/);
  });
});

describe('parseTelemetryFile — 統一入口', () => {
  it('.dtb を自動判別してパースする', () => {
    const session = parseTelemetryFile('amuse_Z34_Ooi_0013_2_21_711.dtb', loadSample());
    expect(session.meta.format).toBe('digispice-dtb');
    expect(session.points).toHaveLength(710);
  });

  it('NMEA テキストを自動判別してパースする', () => {
    const session = parseTelemetryFile('log.txt', toBuffer(NMEA_TEXT));
    expect(session.meta.format).toBe('nmea');
    expect(session.points).toHaveLength(2);
  });

  it('AIM CSV を自動判別してパースする', () => {
    const session = parseTelemetryFile('export.csv', toBuffer(AIM_TEXT));
    expect(session.meta.format).toBe('aim-csv');
    expect(session.points).toHaveLength(2);
    expect(session.meta.extra.Venue).toBe('Suzuka');
  });
});
