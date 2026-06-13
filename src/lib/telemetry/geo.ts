// 地理計算ユーティリティ — Haversine 距離・方位角・局所平面投影
//
// サーキット1個分（数 km 四方）の狭い範囲を扱う前提。
// ラップ検出の交差判定は「基準点まわりの局所equirectangular投影」で
// 平面幾何に落としてから行う（数 km 範囲での歪みは cm オーダーで、
// GPS 自体の誤差(数 m)より十分小さい）。

import type { LatLon } from './types';

/** 地球半径（m）— Haversine 用の平均半径 */
const EARTH_RADIUS_M = 6371000;

/** 緯度1度あたりのメートル（局所平面近似用） */
const METERS_PER_DEG_LAT = 111320;

/** 局所平面座標（基準点からの東向き x / 北向き y、単位 m） */
export interface XY {
  x: number;
  y: number;
}

/**
 * 2点間の Haversine 距離（m）を返す。
 */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * a から b へ向かう方位角（度、真北=0・時計回り 0–360）を返す。
 */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const f1 = (a.lat * Math.PI) / 180;
  const f2 = (b.lat * Math.PI) / 180;
  const dl = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * 基準点 origin まわりの局所平面投影器を返す。
 * toXY: 緯度経度 → メートル座標（東 x / 北 y）、fromXY: 逆変換。
 * サーキット規模（〜10km）の範囲でのみ使うこと。
 */
export function makeLocalProjection(origin: LatLon): {
  toXY: (p: LatLon) => XY;
  fromXY: (p: XY) => LatLon;
} {
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const mPerDegLon = METERS_PER_DEG_LAT * cosLat;
  return {
    toXY: (p: LatLon): XY => ({
      x: (p.lon - origin.lon) * mPerDegLon,
      y: (p.lat - origin.lat) * METERS_PER_DEG_LAT,
    }),
    fromXY: (p: XY): LatLon => ({
      lat: origin.lat + p.y / METERS_PER_DEG_LAT,
      lon: origin.lon + p.x / mPerDegLon,
    }),
  };
}

/**
 * 方位角（度）を 0–360 の範囲に正規化する。
 */
export function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * 方位角の差（度）を -180〜+180 に正規化して返す。
 */
export function headingDiffDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
