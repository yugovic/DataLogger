import { describe, it, expect } from 'vitest';
import {
  wmoToWeather,
  distanceKm,
  nearestTrack,
  findTrackByName,
  trackCenter,
} from './autoWeather';
import { TRACKS } from './tracks';

describe('wmoToWeather', () => {
  it('快晴・おおむね晴れは sunny', () => {
    expect(wmoToWeather(0)).toBe('sunny');
    expect(wmoToWeather(1)).toBe('sunny');
  });

  it('曇り・霧は cloudy', () => {
    expect(wmoToWeather(2)).toBe('cloudy');
    expect(wmoToWeather(3)).toBe('cloudy');
    expect(wmoToWeather(45)).toBe('cloudy');
    expect(wmoToWeather(48)).toBe('cloudy');
  });

  it('霧雨・弱〜並の雨・にわか雨は wet', () => {
    expect(wmoToWeather(51)).toBe('wet');
    expect(wmoToWeather(57)).toBe('wet');
    expect(wmoToWeather(61)).toBe('wet');
    expect(wmoToWeather(63)).toBe('wet');
    expect(wmoToWeather(80)).toBe('wet');
    expect(wmoToWeather(81)).toBe('wet');
  });

  it('強い雨・雪・雷雨は full_wet', () => {
    expect(wmoToWeather(65)).toBe('full_wet');
    expect(wmoToWeather(71)).toBe('full_wet');
    expect(wmoToWeather(82)).toBe('full_wet');
    expect(wmoToWeather(95)).toBe('full_wet');
    expect(wmoToWeather(99)).toBe('full_wet');
  });

  it('未知コード・null は null（0埋めや既定値にしない）', () => {
    expect(wmoToWeather(null)).toBeNull();
    expect(wmoToWeather(undefined)).toBeNull();
    expect(wmoToWeather(NaN)).toBeNull();
    expect(wmoToWeather(4)).toBeNull();
  });
});

describe('distanceKm', () => {
  it('同一地点は 0', () => {
    const p = { lat: 34.8448, lon: 136.5389 };
    expect(distanceKm(p, p)).toBeCloseTo(0, 6);
  });

  it('緯度1度差はおよそ111km', () => {
    const d = distanceKm({ lat: 35, lon: 139 }, { lat: 36, lon: 139 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});

describe('nearestTrack', () => {
  it('鈴鹿の座標からは鈴鹿を返す', () => {
    const suzuka = TRACKS.find((t) => t.id === 'suzuka-full')!;
    const here = trackCenter(suzuka);
    expect(nearestTrack(here)?.id).toBe('suzuka-full');
  });

  it('筑波の座標からは筑波を返す', () => {
    const tsukuba = TRACKS.find((t) => t.id === 'tsukuba-2000')!;
    expect(nearestTrack(trackCenter(tsukuba))?.id).toBe('tsukuba-2000');
  });

  it('どのサーキットからも離れていれば null（勝手に選ばない）', () => {
    // 太平洋上
    expect(nearestTrack({ lat: 30.0, lon: 145.0 })).toBeNull();
  });

  it('閾値を超える距離では null', () => {
    const suzuka = trackCenter(TRACKS.find((t) => t.id === 'suzuka-full')!);
    const farAway = { lat: suzuka.lat + 0.5, lon: suzuka.lon };
    expect(nearestTrack(farAway, 5)).toBeNull();
  });
});

describe('findTrackByName', () => {
  it('正式名称で引ける', () => {
    expect(findTrackByName('鈴鹿サーキット（国際レーシングコース）')?.id).toBe('suzuka-full');
  });

  it('略称（括弧より前）でも引ける', () => {
    expect(findTrackByName('鈴鹿サーキット')?.id).toBe('suzuka-full');
  });

  it('空文字は null', () => {
    expect(findTrackByName('')).toBeNull();
    expect(findTrackByName('   ')).toBeNull();
  });

  it('未知の名前は null', () => {
    expect(findTrackByName('存在しないサーキット')).toBeNull();
  });
});

describe('trackCenter', () => {
  it('スタートフィニッシュラインの中点を返す', () => {
    const suzuka = TRACKS.find((t) => t.id === 'suzuka-full')!;
    const c = trackCenter(suzuka);
    // 校正済みの通過点 (34.844794, 136.538867) の近傍にあること
    expect(c.lat).toBeCloseTo(34.8448, 2);
    expect(c.lon).toBeCloseTo(136.5388, 2);
  });
});
