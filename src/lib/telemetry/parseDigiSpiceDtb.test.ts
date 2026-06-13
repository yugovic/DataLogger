// DigiSpice .dtb パーサー — 実走サンプルによる回帰テスト + 異常系
//
// サンプル: amuse_Z34_Ooi_0013_2_21_711.dtb（実走行の1ラップ切り出しファイル。
// ファイル名は「ラップ13・タイム 2:21.711」を示し、解析結果と一致する）
// 期待値は実装の実行結果から確定値としてロックしたもの（リバース
// エンジニアリング型の回帰アンカー）。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calcCumulativeDistance } from './derive';
import { detectLaps, estimateStartFinishLine } from './detectLaps';
import { bearingDeg } from './geo';
import { looksLikeDtb, parseDigiSpiceDtb, readExtended80 } from './parseDigiSpiceDtb';
import { TelemetryParseError, type TelemetryPoint } from './types';
import { findTrackById, guessTrack } from '../tracks';

const SAMPLE_PATH = fileURLToPath(
  new URL('../../components/demo/SampleData/amuse_Z34_Ooi_0013_2_21_711.dtb', import.meta.url),
);

/** サンプル .dtb を ArrayBuffer として読む */
function loadSample(): ArrayBuffer {
  const buf = readFileSync(SAMPLE_PATH);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** テスト用: 80bit 拡張浮動小数点を書き込む（readExtended80 の逆操作） */
function writeExtended80(view: DataView, offset: number, value: number): void {
  if (value === 0 || !Number.isFinite(value)) {
    for (let i = 0; i < 16; i++) view.setUint8(offset + i, 0);
    return;
  }
  const sign = value < 0 ? 1 : 0;
  const abs = Math.abs(value);
  const exp = Math.floor(Math.log2(abs));
  const mantissa = abs * Math.pow(2, 63 - exp); // [2^63, 2^64)
  const hi = Math.floor(mantissa / 4294967296);
  const lo = Math.floor(mantissa - hi * 4294967296);
  view.setUint32(offset, lo, true);
  view.setUint32(offset + 4, hi, true);
  view.setUint16(offset + 8, ((sign << 15) | (exp + 16383)) & 0xffff, true);
  view.setUint32(offset + 10, 0, true);
  view.setUint16(offset + 14, 0, true);
}

/** テスト用: 合成 .dtb レコードを生成する */
function buildSyntheticDtb(records: Array<{ elapsed: number; lat: number; lon: number; speed: number }>): ArrayBuffer {
  const buffer = new ArrayBuffer(records.length * 128);
  const view = new DataView(buffer);
  const serialBase = 41256.5; // 2012-12-13 12:00 JST 相当
  records.forEach((r, i) => {
    const o = i * 128;
    view.setFloat64(o, serialBase + r.elapsed / 86400, true);
    view.setFloat64(o + 8, r.elapsed / 86400, true);
    writeExtended80(view, o + 16, r.elapsed);
    writeExtended80(view, o + 32, r.lat);
    writeExtended80(view, o + 48, r.lon);
    writeExtended80(view, o + 64, 50); // 高度
    writeExtended80(view, o + 80, r.speed);
    writeExtended80(view, o + 96, 90); // 逆方位
    writeExtended80(view, o + 112, 0);
  });
  return buffer;
}

// ─── 実走サンプルの回帰アンカー ──────────────────────────────────────────────

describe('parseDigiSpiceDtb — 実走サンプル回帰（amuse_Z34_Ooi）', () => {
  const session = parseDigiSpiceDtb(loadSample());

  it('710 レコードすべてが有効な点として読める', () => {
    expect(session.points).toHaveLength(710);
    expect(session.meta.format).toBe('digispice-dtb');
    expect(session.meta.extra.SkippedRecords).toBeUndefined();
  });

  it('走行時間は 141.711 秒（ファイル名の 2:21.711 と一致）', () => {
    const last = session.points[session.points.length - 1];
    expect(session.points[0].time).toBe(0);
    expect(last.time).toBeCloseTo(141.7107, 3);
  });

  it('サンプルレートは 5 Hz と推定される', () => {
    expect(session.meta.sampleRateHz).toBe(5);
  });

  it('セッション開始時刻は 2012-12-13 10:59:37 JST（= 01:59:37 UTC）', () => {
    expect(session.meta.startTimestamp?.toISOString()).toMatch(/^2012-12-13T01:59:37/);
  });

  it('速度レンジは 52.0–228.2 km/h（プロトタイプの誤割当を修正した正しいチャネル）', () => {
    const speeds = session.points.map((p) => p.speed);
    expect(Math.min(...speeds)).toBeCloseTo(51.961, 2);
    expect(Math.max(...speeds)).toBeCloseTo(228.247, 2);
  });

  it('高度レンジは 67.8–107.7 m（鈴鹿の高低差約 40m と整合）', () => {
    const alts = session.points.map((p) => p.altitude ?? Number.NaN);
    expect(Math.min(...alts)).toBeCloseTo(67.78, 1);
    expect(Math.max(...alts)).toBeCloseTo(107.65, 1);
  });

  it('座標レンジは鈴鹿サーキット周辺（34.84N / 136.53E）', () => {
    const lats = session.points.map((p) => p.lat ?? Number.NaN);
    const lons = session.points.map((p) => p.lon ?? Number.NaN);
    expect(Math.min(...lats)).toBeGreaterThan(34.83);
    expect(Math.max(...lats)).toBeLessThan(34.85);
    expect(Math.min(...lons)).toBeGreaterThan(136.52);
    expect(Math.max(...lons)).toBeLessThan(136.55);
  });

  it('累積距離は約 5781 m（鈴鹿フルコース 5807m のレーシングライン相当）', () => {
    const dist = calcCumulativeDistance(session.points);
    expect(dist[dist.length - 1]).toBeGreaterThan(5700);
    expect(dist[dist.length - 1]).toBeLessThan(5860);
  });

  it('heading は GPS 軌跡から計算した進行方位と整合する（中央値誤差 < 3°）', () => {
    const pts = session.points;
    const errors: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const heading = pts[i].heading;
      const lat0 = pts[i - 1].lat;
      const lon0 = pts[i - 1].lon;
      const lat1 = pts[i].lat;
      const lon1 = pts[i].lon;
      if (heading === null || lat0 === null || lon0 === null || lat1 === null || lon1 === null) continue;
      const course = bearingDeg({ lat: lat0, lon: lon0 }, { lat: lat1, lon: lon1 });
      let d = Math.abs(heading - course);
      if (d > 180) d = 360 - d;
      errors.push(d);
    }
    errors.sort((a, b) => a - b);
    expect(errors[Math.floor(errors.length / 2)]).toBeLessThan(3);
  });
});

// ─── ラップ検出の回帰（サンプル + 合成セッション） ───────────────────────────

describe('detectLaps — 実走サンプル回帰', () => {
  const session = parseDigiSpiceDtb(loadSample());
  const suzuka = findTrackById('suzuka-full');

  it('guessTrack はサンプル軌跡から鈴鹿フルコースを推定する', () => {
    expect(guessTrack(session.points)?.id).toBe('suzuka-full');
  });

  it('1ラップ切り出しファイルでは交差1回 → OUT(141.611s) + IN(0.100s) になる', () => {
    // DigiSpice 公式ソフトはライン交差でファイルを切り出すため、
    // 1ファイル内でラインを跨ぐのは復帰時の1回のみ（= 完全周は証明できない）。
    // OUT ラップの長さがほぼ真のラップタイムに一致することが軌跡整合の証左。
    expect(suzuka).not.toBeNull();
    if (!suzuka) return;
    const result = detectLaps(session.points, suzuka.startFinishLine, {
      minLapSeconds: suzuka.minLapSeconds,
    });
    expect(result.crossingTimes).toHaveLength(1);
    expect(result.crossingTimes[0]).toBeCloseTo(141.6107, 3);
    expect(result.laps).toHaveLength(2);
    expect(result.laps[0].type).toBe('OUT');
    expect(result.laps[0].timeSeconds).toBeCloseTo(141.6107, 3);
    expect(result.laps[1].type).toBe('IN');
    expect(result.laps[1].timeSeconds).toBeCloseTo(0.1, 2);
    expect(result.bestLapIndex).toBeNull();
    // OUT + IN の合計 = 総走行時間
    const total = result.laps.reduce((s, l) => s + l.timeSeconds, 0);
    expect(total).toBeCloseTo(141.7107, 3);
  });

  /** 実ラップを周期 141.9107s（実走 141.711s + 1サンプル間隔）で3周つなげた合成セッション */
  function buildThreeLapSession(): TelemetryPoint[] {
    const dt = 0.2;
    const period = session.points[session.points.length - 1].time + dt;
    const synth: TelemetryPoint[] = [];
    for (let k = 0; k < 3; k++) {
      for (const p of session.points) synth.push({ ...p, time: p.time + k * period });
    }
    return synth;
  }

  it('3周合成セッションで NORMAL 2周が検出され、ラップタイムが構成周期と一致する', () => {
    expect(suzuka).not.toBeNull();
    if (!suzuka) return;
    const synth = buildThreeLapSession();
    const result = detectLaps(synth, suzuka.startFinishLine, { minLapSeconds: suzuka.minLapSeconds });

    expect(result.crossingTimes).toHaveLength(3);
    expect(result.laps.map((l) => l.type)).toEqual(['OUT', 'NORMAL', 'NORMAL', 'IN']);
    // 内挿精度: 検出ラップタイム = 合成周期 141.9107s（誤差 1ms 未満）
    expect(result.laps[1].timeSeconds).toBeCloseTo(141.9107, 3);
    expect(result.laps[2].timeSeconds).toBeCloseTo(141.9107, 3);
    expect(result.bestLapIndex).toBe(1);
    // タイム妥当性: 30秒〜5分/周
    for (const lap of result.laps) {
      if (lap.type === 'NORMAL') {
        expect(lap.timeSeconds).toBeGreaterThan(30);
        expect(lap.timeSeconds).toBeLessThan(300);
      }
    }
  });

  it('ライン未知でも自動推定で同じ周期のラップが切れる（トラックDB非依存パス）', () => {
    const synth = buildThreeLapSession();
    const line = estimateStartFinishLine(synth);
    expect(line).not.toBeNull();
    if (!line) return;
    const result = detectLaps(synth, line);
    const normals = result.laps.filter((l) => l.type === 'NORMAL');
    expect(normals).toHaveLength(2);
    for (const lap of normals) {
      expect(lap.timeSeconds).toBeCloseTo(141.9107, 2);
    }
  });

  it('1ラップのみのファイルでは自動推定は null（周回性が確認できない）', () => {
    expect(estimateStartFinishLine(session.points)).toBeNull();
  });
});

// ─── 異常系・構造検証 ────────────────────────────────────────────────────────

describe('parseDigiSpiceDtb — 異常系', () => {
  it('空のバッファは明確なエラーメッセージで失敗する', () => {
    expect(() => parseDigiSpiceDtb(new ArrayBuffer(0))).toThrow(TelemetryParseError);
    expect(() => parseDigiSpiceDtb(new ArrayBuffer(0))).toThrow(/小さすぎます/);
  });

  it('1レコード未満（128バイト）のファイルは失敗する', () => {
    expect(() => parseDigiSpiceDtb(new ArrayBuffer(128))).toThrow(/小さすぎます/);
  });

  it('先頭が Excel 序数日付でないバイナリは .dtb として拒否される', () => {
    const buffer = new ArrayBuffer(512);
    new DataView(buffer).setFloat64(0, 12.34, true); // レンジ外
    expect(() => parseDigiSpiceDtb(buffer)).toThrow(/Excel 序数日付ではありません/);
  });

  it('テキストファイル（ゼロ埋めでない任意データ）は拒否される', () => {
    const text = new TextEncoder().encode('$GPRMC,'.repeat(100));
    const ab = text.buffer.slice(0, 512) as ArrayBuffer;
    expect(() => parseDigiSpiceDtb(ab)).toThrow(TelemetryParseError);
  });

  it('合成 .dtb が正しくラウンドトリップする（時刻・座標・速度）', () => {
    const buffer = buildSyntheticDtb([
      { elapsed: 0, lat: 35.0, lon: 139.0, speed: 100 },
      { elapsed: 0.2, lat: 35.0001, lon: 139.0001, speed: 101 },
      { elapsed: 0.4, lat: 35.0002, lon: 139.0002, speed: 102 },
    ]);
    const session = parseDigiSpiceDtb(buffer);
    expect(session.points).toHaveLength(3);
    expect(session.points[1].time).toBeCloseTo(0.2, 6);
    expect(session.points[1].lat).toBeCloseTo(35.0001, 8);
    expect(session.points[1].lon).toBeCloseTo(139.0001, 8);
    expect(session.points[1].speed).toBeCloseTo(101, 6);
    expect(session.points[1].heading).toBeCloseTo(270, 6); // 逆方位90° + 180°
    expect(session.points[1].altitude).toBeCloseTo(50, 6);
  });

  it('末尾の半端なバイトは無視され extra に記録される', () => {
    const full = buildSyntheticDtb([
      { elapsed: 0, lat: 35.0, lon: 139.0, speed: 100 },
      { elapsed: 0.2, lat: 35.0001, lon: 139.0001, speed: 101 },
    ]);
    const truncated = new ArrayBuffer(full.byteLength + 50);
    new Uint8Array(truncated).set(new Uint8Array(full), 0);
    const session = parseDigiSpiceDtb(truncated);
    expect(session.points).toHaveLength(2);
    expect(session.meta.extra.TruncatedBytes).toBe('50');
  });

  it('座標レンジ外のレコードはスキップされ、多すぎる場合は破損として拒否される', () => {
    const records = [
      { elapsed: 0, lat: 35.0, lon: 139.0, speed: 100 },
      { elapsed: 0.2, lat: 200, lon: 139.0, speed: 100 }, // 緯度不正
      { elapsed: 0.4, lat: 35.0, lon: 139.0, speed: 100 },
      { elapsed: 0.6, lat: 35.0, lon: 139.0, speed: 100 },
      { elapsed: 0.8, lat: 35.0, lon: 139.0, speed: 100 },
    ];
    const session = parseDigiSpiceDtb(buildSyntheticDtb(records));
    expect(session.points).toHaveLength(4);
    expect(session.meta.extra.SkippedRecords).toBe('1');

    // 半数以上が不正 → 破損データとして throw
    const broken = [
      { elapsed: 0, lat: 35.0, lon: 139.0, speed: 100 },
      { elapsed: 0.2, lat: 200, lon: 139.0, speed: 100 },
      { elapsed: 0.4, lat: 200, lon: 139.0, speed: 100 },
      { elapsed: 0.6, lat: 35.0, lon: 139.0, speed: 100 },
    ];
    expect(() => parseDigiSpiceDtb(buildSyntheticDtb(broken))).toThrow(/不正レコードが多すぎます/);
  });

  it('looksLikeDtb はサンプルに true、テキストに false を返す', () => {
    expect(looksLikeDtb(loadSample())).toBe(true);
    const text = new TextEncoder().encode('A'.repeat(512));
    expect(looksLikeDtb(text.buffer.slice(0) as ArrayBuffer)).toBe(false);
    expect(looksLikeDtb(new ArrayBuffer(100))).toBe(false);
  });
});

describe('readExtended80', () => {
  it('ゼロ・正数・負数を正しく読む', () => {
    const buffer = new ArrayBuffer(48);
    const view = new DataView(buffer);
    writeExtended80(view, 0, 0);
    writeExtended80(view, 16, 136.53886650925125);
    writeExtended80(view, 32, -42.5);
    expect(readExtended80(view, 0)).toBe(0);
    expect(readExtended80(view, 16)).toBeCloseTo(136.53886650925125, 10);
    expect(readExtended80(view, 32)).toBeCloseTo(-42.5, 10);
  });

  it('指数 0x7FFF は Infinity / NaN として読む', () => {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    // +Infinity: 仮数 = 整数ビットのみ（hi の最上位ビット）
    view.setUint32(0, 0, true);
    view.setUint32(4, 0x80000000, true);
    view.setUint16(8, 0x7fff, true);
    expect(readExtended80(view, 0)).toBe(Number.POSITIVE_INFINITY);
    // NaN: 小数部に非ゼロビット
    view.setUint32(0, 1, true);
    expect(Number.isNaN(readExtended80(view, 0))).toBe(true);
  });
});
