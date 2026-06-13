// ライン解決チェーンの統合テスト — 取込 UI が使う決定ロジックを
// 実走サンプル（鈴鹿 .dtb）と合成軌跡でロックする。
//
// 確認する運用方針（tracks.ts / README 参照）:
//   - DB 校正済みコース: DB ラインで検出（1ラップ切り出しファイルは OUT+IN）
//   - DB ラインで交差ゼロ（未校正コース等）: 自動推定へフォールバック
//   - コース不明: 自動推定のみ
//   - 周回が証明できない軌跡: 空を返す（捏造しない）

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTelemetryFile } from '../../lib/telemetry';
import type { TelemetryPoint, TelemetrySession } from '../../lib/telemetry';
import { findTrackById } from '../../lib/tracks';
import { resolveLapDetection } from './resolveLapDetection';

const SAMPLE_DTB_PATH = new URL(
  '../../components/demo/SampleData/amuse_Z34_Ooi_0013_2_21_711.dtb',
  import.meta.url,
);

function loadSampleSession(): TelemetrySession {
  const buf = readFileSync(SAMPLE_DTB_PATH);
  return parseTelemetryFile(
    'amuse_Z34_Ooi_0013_2_21_711.dtb',
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

const M_PER_DEG_LAT = 111320;

/** 中心 (lat0, lon0) 周辺の矩形コース周回軌跡（1200m 周長、20m/s、60s/周） */
function rectangleLaps(lat0: number, lon0: number, laps: number, sampleHz = 5): TelemetryPoint[] {
  const mPerDegLon = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const speed = 20; // m/s
  const perimeter = 1200;
  const dt = 1 / sampleHz;
  const total = (laps * perimeter) / speed;
  const points: TelemetryPoint[] = [];
  for (let t = 0; t <= total + 1e-9; t += dt) {
    const s = (t * speed) % perimeter;
    let x: number;
    let y: number;
    if (s < 400) {
      x = s;
      y = 0;
    } else if (s < 600) {
      x = 400;
      y = s - 400;
    } else if (s < 1000) {
      x = 400 - (s - 600);
      y = 200;
    } else {
      x = 0;
      y = 200 - (s - 1000);
    }
    points.push({
      time: t,
      lat: lat0 + y / M_PER_DEG_LAT,
      lon: lon0 + x / mPerDegLon,
      speed: speed * 3.6,
      heading: null,
      altitude: null,
    });
  }
  return points;
}

function asSession(points: TelemetryPoint[]): TelemetrySession {
  return {
    points,
    meta: { format: 'nmea', sampleRateHz: 5, source: 'test', extra: {} },
  };
}

describe('resolveLapDetection — 実走サンプル（鈴鹿・1ラップ切り出し .dtb）', () => {
  it('DB ラインで検出し、OUT+IN を正直に返す（NORMAL を捏造しない）', () => {
    const session = loadSampleSession();
    const resolved = resolveLapDetection(session);

    expect(resolved.track?.id).toBe('suzuka-full');
    expect(resolved.lineSource).toBe('db');
    expect(resolved.line).toBe(findTrackById('suzuka-full')?.startFinishLine);
    // 1ラップ切り出しファイルはライン通過1回 → OUT + IN（仕様、README 参照）
    expect(resolved.detection.laps.map((l) => l.type)).toEqual(['OUT', 'IN']);
    expect(resolved.detection.bestLapIndex).toBeNull();
  });
});

describe('resolveLapDetection — フォールバック', () => {
  it('コース DB 未登録の周回軌跡では自動推定ラインで NORMAL が切れる', () => {
    // 相模湾上 — DB のどのサーキットからも 1.5km 以上離れている
    const resolved = resolveLapDetection(asSession(rectangleLaps(35.0, 139.5, 4)));

    expect(resolved.track).toBeNull();
    expect(resolved.lineSource).toBe('estimated');
    const normals = resolved.detection.laps.filter((l) => l.type === 'NORMAL');
    expect(normals.length).toBeGreaterThanOrEqual(2);
    for (const lap of normals) {
      expect(lap.timeSeconds).toBeCloseTo(60, 1);
    }
  });

  it('DB コース近傍だが未校正ラインが軌跡と交差しない場合、自動推定へフォールバックする', () => {
    // 筑波2000 のライン中心から南へ約 700m（guessTrack の閾値 1.5km 以内、
    // ライン線分 ±18m には届かない位置）に矩形コースを置く
    const tsukuba = findTrackById('tsukuba-2000');
    expect(tsukuba).not.toBeNull();
    if (!tsukuba) return;
    const [a, b] = tsukuba.startFinishLine;
    const centerLat = (a.lat + b.lat) / 2 - 700 / M_PER_DEG_LAT;
    const centerLon = (a.lon + b.lon) / 2;

    const resolved = resolveLapDetection(asSession(rectangleLaps(centerLat, centerLon, 4)));

    expect(resolved.track?.id).toBe('tsukuba-2000'); // コース推定は維持
    expect(resolved.lineSource).toBe('estimated');   // ラインは軌跡から自動推定
    expect(resolved.detection.laps.filter((l) => l.type === 'NORMAL').length).toBeGreaterThanOrEqual(2);
  });

  it('周回しない軌跡では空の検出結果を返す（ラップを捏造しない）', () => {
    // 相模湾上を一方向へ走るだけの軌跡
    const points: TelemetryPoint[] = [];
    for (let t = 0; t <= 120; t++) {
      points.push({
        time: t,
        lat: 35.0,
        lon: 139.5 + (t * 20) / (M_PER_DEG_LAT * Math.cos((35.0 * Math.PI) / 180)),
        speed: 72,
        heading: null,
        altitude: null,
      });
    }
    const resolved = resolveLapDetection(asSession(points));

    expect(resolved.track).toBeNull();
    expect(resolved.lineSource).toBeNull();
    expect(resolved.line).toBeNull();
    expect(resolved.detection.laps).toEqual([]);
    expect(resolved.detection.bestLapIndex).toBeNull();
  });
});
