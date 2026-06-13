// フォーマット自動判別とルーティング
//
// 判別はコンテンツ優先（バイト先頭の構造）で行い、ファイル名（拡張子）は
// 期待フォーマットの明示とエラーメッセージの改善に使う。
//
// 判別順序（特異性の高い順）:
//   1. .dtb バイナリ: 先頭 float64 が Excel 序数日付レンジ + 第2レコードと整合
//   2. NMEA: テキスト先頭付近に $GPRMC / $GNRMC 行
//   3. AIM CSV: "キー","値" メタ行 または 4列以上のクォート付きヘッダ行

import { parseAimCsv } from './parseAimCsv';
import { looksLikeDtb, parseDigiSpiceDtb } from './parseDigiSpiceDtb';
import { parseNmeaRmc } from './parseNmeaRmc';
import { TelemetryParseError, type TelemetryFormat, type TelemetrySession } from './types';

/** テキスト判別に使う先頭バイト数 */
const SNIFF_BYTES = 8192;

/** バッファ先頭を UTF-8 テキストとしてデコード（バイナリ混在でも落ちない） */
function sniffText(buffer: ArrayBuffer): string {
  const slice = buffer.slice(0, SNIFF_BYTES);
  return new TextDecoder('utf-8', { fatal: false }).decode(slice);
}

/** NMEA RMC らしさ: 行頭の $GPRMC / $GNRMC */
function looksLikeNmea(head: string): boolean {
  return /^\$G[PN]RMC,/m.test(head);
}

/** AIM CSV らしさ: 既知メタ行 or クォート付き多列ヘッダ行 */
function looksLikeAimCsv(head: string): boolean {
  if (/^"(Format|Venue|Date|Time|Sample Rate|Segment)"\s*,/m.test(head)) return true;
  // 先頭20行以内に「"…","…","…","…"」形式の4列以上の行があるか
  const lines = head.split('\n', 20);
  return lines.some((l) => {
    const t = l.trim();
    return t.startsWith('"') && t.split(',').length >= 4;
  });
}

/**
 * ファイル名とバイト先頭からテレメトリフォーマットを判別する。
 *
 * @param fileName ファイル名（拡張子ヒントとエラーメッセージに使用）
 * @param buffer ファイル内容
 * @returns 判別されたフォーマット識別子
 * @throws TelemetryParseError どのフォーマットとも判別できない場合、
 *         または拡張子 .dtb なのにバイナリ構造が .dtb でない場合
 */
export function detectFormat(fileName: string, buffer: ArrayBuffer): TelemetryFormat {
  const lowerName = fileName.toLowerCase();

  // 拡張子 .dtb はバイナリ前提 — 構造検証に失敗したら明確にエラー
  if (lowerName.endsWith('.dtb')) {
    if (looksLikeDtb(buffer)) return 'digispice-dtb';
    throw new TelemetryParseError(
      'DigiSpice .dtb',
      `拡張子は .dtb ですが先頭バイトが .dtb の構造（Excel 序数日付）と一致しません（ファイル: ${fileName}）`,
    );
  }

  // コンテンツによる判別（特異性の高い順）
  if (looksLikeDtb(buffer)) return 'digispice-dtb';

  const head = sniffText(buffer);
  if (looksLikeNmea(head)) return 'nmea';
  if (looksLikeAimCsv(head)) return 'aim-csv';

  // 拡張子によるフォールバック（コンテンツ判別が利かなかった場合）
  if (lowerName.endsWith('.csv')) return 'aim-csv';
  if (lowerName.endsWith('.nmea')) return 'nmea';

  throw new TelemetryParseError(
    'テレメトリ自動判別',
    `対応フォーマット（DigiSpice .dtb / NMEA RMC / AIM CSV）のいずれとも判別できません（ファイル: ${fileName}）`,
  );
}

/**
 * テレメトリファイルを自動判別して適切なパーサーでパースする統一入口。
 *
 * @param fileName ファイル名
 * @param buffer ファイル内容（ArrayBuffer。File.arrayBuffer() の結果等）
 * @returns 正規化された TelemetrySession
 * @throws TelemetryParseError 判別失敗またはパース失敗
 */
export function parseTelemetryFile(fileName: string, buffer: ArrayBuffer): TelemetrySession {
  const format = detectFormat(fileName, buffer);
  switch (format) {
    case 'digispice-dtb':
      return parseDigiSpiceDtb(buffer);
    case 'nmea':
      return parseNmeaRmc(new TextDecoder('utf-8', { fatal: false }).decode(buffer));
    case 'aim-csv':
      return parseAimCsv(new TextDecoder('utf-8', { fatal: false }).decode(buffer));
  }
}
