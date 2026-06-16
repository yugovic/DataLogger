// サーキット DB と guessTrack のテスト

import { describe, expect, it } from 'vitest';
import { findTrackById, guessTrack, TRACKS } from './tracks';
import { haversineMeters } from './telemetry/geo';
import type { TelemetryPoint } from './telemetry/types';

/** 指定中心の周囲を回る円軌跡（半径 m）を生成する */
function circleAround(lat: number, lon: number, radiusM: number, seconds: number): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const mPerDegLat = 111320;
  const mPerDegLon = mPerDegLat * Math.cos((lat * Math.PI) / 180);
  for (let t = 0; t <= seconds; t++) {
    const angle = (t / seconds) * 2 * Math.PI * 3; // 3周
    points.push({
      time: t,
      lat: lat + (radiusM * Math.sin(angle)) / mPerDegLat,
      lon: lon + (radiusM * Math.cos(angle)) / mPerDegLon,
      speed: 100,
      heading: null,
      altitude: null,
    });
  }
  return points;
}

describe('TRACKS — DB 整合性', () => {
  it('id は一意である', () => {
    const ids = TRACKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('全コースのラインは 20〜100m の有効な線分である', () => {
    for (const track of TRACKS) {
      const [a, b] = track.startFinishLine;
      const length = haversineMeters(a, b);
      expect(length, `${track.id} のライン長`).toBeGreaterThanOrEqual(20);
      expect(length, `${track.id} のライン長`).toBeLessThanOrEqual(100);
      expect(Math.abs(a.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(a.lon)).toBeLessThanOrEqual(180);
    }
  });

  it('最小ラップ時間は 20 秒以上に設定されている', () => {
    for (const track of TRACKS) {
      expect(track.minLapSeconds, track.id).toBeGreaterThanOrEqual(20);
    }
  });

  it('表示用トラックマップは距離軸と範囲が整合している', () => {
    for (const track of TRACKS) {
      if (!track.map) continue;
      expect(track.map.widthM, `${track.id} width`).toBeGreaterThan(5);
      expect(track.map.centerline.length, `${track.id} centerline`).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < track.map.centerline.length; i++) {
        expect(track.map.centerline[i].distanceM, `${track.id} centerline distance`).toBeGreaterThan(
          track.map.centerline[i - 1].distanceM,
        );
      }
      const lapLength = track.map.centerline[track.map.centerline.length - 1].distanceM;
      for (const sector of track.map.sectors) {
        expect(sector.startDistanceM, `${track.id} ${sector.id}`).toBeGreaterThanOrEqual(0);
        expect(sector.endDistanceM, `${track.id} ${sector.id}`).toBeLessThanOrEqual(lapLength);
        expect(sector.endDistanceM, `${track.id} ${sector.id}`).toBeGreaterThan(sector.startDistanceM);
      }
      for (const marker of track.map.markers) {
        expect(marker.distanceM, `${track.id} ${marker.id}`).toBeGreaterThanOrEqual(0);
        expect(marker.distanceM, `${track.id} ${marker.id}`).toBeLessThanOrEqual(lapLength);
      }
      for (const curb of track.map.curbs) {
        expect(curb.startDistanceM, `${track.id} ${curb.id}`).toBeGreaterThanOrEqual(0);
        expect(curb.endDistanceM, `${track.id} ${curb.id}`).toBeLessThanOrEqual(lapLength);
        expect(curb.endDistanceM, `${track.id} ${curb.id}`).toBeGreaterThan(curb.startDistanceM);
      }
    }
  });

  it('国内主要サーキットを収録している', () => {
    for (const id of ['suzuka-full', 'tsukuba-2000', 'fuji-main', 'motegi-road', 'okayama-international', 'sugo', 'central', 'nikko', 'honjo', 'ebisu-east', 'ebisu-west']) {
      expect(findTrackById(id), id).not.toBeNull();
    }
  });
});

describe('guessTrack', () => {
  it('鈴鹿のライン付近を周回する軌跡は鈴鹿と推定される', () => {
    const suzuka = findTrackById('suzuka-full');
    expect(suzuka).not.toBeNull();
    if (!suzuka) return;
    const [a, b] = suzuka.startFinishLine;
    const points = circleAround((a.lat + b.lat) / 2, (a.lon + b.lon) / 2, 400, 300);
    expect(guessTrack(points)?.id).toBe('suzuka-full');
  });

  it('筑波のライン付近の軌跡は筑波と推定される', () => {
    const tsukuba = findTrackById('tsukuba-2000');
    expect(tsukuba).not.toBeNull();
    if (!tsukuba) return;
    const [a, b] = tsukuba.startFinishLine;
    const points = circleAround((a.lat + b.lat) / 2, (a.lon + b.lon) / 2, 300, 300);
    expect(guessTrack(points)?.id).toBe('tsukuba-2000');
  });

  it('どのサーキットからも遠い軌跡（海上）は null', () => {
    const points = circleAround(35.0, 139.5, 400, 300); // 相模湾
    expect(guessTrack(points)).toBeNull();
  });

  it('GPS が無いセッションは null', () => {
    const points: TelemetryPoint[] = [
      { time: 0, lat: null, lon: null, speed: 100, heading: null, altitude: null },
      { time: 1, lat: null, lon: null, speed: 100, heading: null, altitude: null },
    ];
    expect(guessTrack(points)).toBeNull();
  });

  it('空配列は null', () => {
    expect(guessTrack([])).toBeNull();
  });
});

describe('findTrackById', () => {
  it('存在する id は Track を返し、無い id は null を返す', () => {
    expect(findTrackById('suzuka-full')?.name).toContain('鈴鹿');
    expect(findTrackById('no-such-track')).toBeNull();
  });
});
