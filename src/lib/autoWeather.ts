/**
 * 環境データの自動取得（入力項目そのものを消すための基盤）
 *
 * ピットでの記録は「次の走行枠までに終わらせる」ことが最優先で、
 * 気温・湿度・気圧・天気はドライバーが体感で入れる値ではなく観測値である。
 * ここでは現在地（GPS）または選択済みサーキットの座標から観測値を取得し、
 * 入力欄そのものを消す。
 *
 * データ品質方針（CLAUDE.md）:
 * - 取得できなかった項目は null のまま返す。0 やデモ値で埋めない。
 * - 自動取得値は観測点（気象モデル）の値であってピット実測ではないため、
 *   provenance を 'auto' として記録し、ドライバーが上書きしたら 'manual' に変える。
 *   出所を混ぜたまま売れるデータにはしない。
 */

import { TRACKS, type Track } from './tracks';
import type { WeatherCode } from '../types/setup';

/** 値の出所。保存データに残し、実測値と観測値を混同させない */
export type FieldProvenance = 'auto' | 'manual';

export interface AutoWeather {
  /** 気温 (°C)。取得できなければ null */
  airTemp: number | null;
  /** 相対湿度 (%) */
  humidity: number | null;
  /** 地表気圧 (hPa) */
  pressure: number | null;
  /** 天気。WMO コードから本アプリの4分類へ写像。判定できなければ null */
  weather: WeatherCode | null;
  /** 観測時刻（ISO8601, サーキット現地時刻） */
  observedAt: string | null;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * WMO Weather interpretation code → 本アプリの天気4分類。
 * 路面が濡れるかどうかで分ける（ドライバーにとっての意味がそれだから）。
 * https://open-meteo.com/en/docs の weather_code 定義に対応。
 */
export function wmoToWeather(code: number | null | undefined): WeatherCode | null {
  if (code == null || !Number.isFinite(code)) return null;
  // 0: 快晴, 1: おおむね晴れ
  if (code === 0 || code === 1) return 'sunny';
  // 2: 一部曇, 3: 曇, 45/48: 霧
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  // 51-57: 霧雨, 61/63: 雨(弱・並), 66: 着氷性雨, 80/81: にわか雨(弱・並)
  if ((code >= 51 && code <= 57) || code === 61 || code === 63 || code === 66 || code === 80 || code === 81) {
    return 'wet';
  }
  // 65: 強い雨, 67: 強い着氷性雨, 71-77: 雪, 82: 激しいにわか雨, 85/86: にわか雪, 95-99: 雷雨
  if (code === 65 || code === 67 || (code >= 71 && code <= 77) || code === 82 || code === 85 || code === 86 || code >= 95) {
    return 'full_wet';
  }
  return null;
}

/** startFinishLine（2点で定義された線分）の中点をサーキット代表座標とする */
export function trackCenter(track: Track): LatLon {
  const [a, b] = track.startFinishLine;
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
}

/** 2点間のおおよその距離(km)。最寄りサーキット判定にしか使わないので簡易式で足りる */
export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 現在地から最寄りのサーキットを返す。
 * thresholdKm 以内に無ければ null（＝サーキットに居ないと判断し、自動選択しない）。
 * サーキットの敷地は大きくても数km四方なので既定 5km。
 */
export function nearestTrack(here: LatLon, thresholdKm = 5): Track | null {
  let best: { track: Track; d: number } | null = null;
  for (const track of TRACKS) {
    const d = distanceKm(here, trackCenter(track));
    if (best == null || d < best.d) best = { track, d };
  }
  return best && best.d <= thresholdKm ? best.track : null;
}

/** サーキット名（自由入力文字列）から TRACKS を緩く引く。表記ゆれに耐えるため部分一致も見る */
export function findTrackByName(name: string): Track | null {
  const q = name.trim();
  if (!q) return null;
  const exact = TRACKS.find((t) => t.name === q);
  if (exact) return exact;
  // 「鈴鹿サーキット」→「鈴鹿サーキット（国際レーシングコース）」のような前方一致・部分一致
  return TRACKS.find((t) => t.name.includes(q) || q.includes(t.name.split('（')[0])) ?? null;
}

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/**
 * 座標の現在の観測値を取得する。APIキー不要（Open-Meteo）。
 * 圏外・API障害時は例外を投げず、全項目 null の結果を返す
 * （記録作業を止めないことを、値が揃うことより優先する）。
 */
export async function fetchWeatherAt(
  coords: LatLon,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<AutoWeather> {
  const empty: AutoWeather = {
    airTemp: null, humidity: null, pressure: null, weather: null, observedAt: null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
  // 呼び出し側の中断も尊重する
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const url =
      `${OPEN_METEO_ENDPOINT}?latitude=${coords.lat.toFixed(4)}&longitude=${coords.lon.toFixed(4)}` +
      '&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code&timezone=auto';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return empty;
    const json = await res.json();
    const c = json?.current;
    if (!c) return empty;

    const num = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    return {
      airTemp: num(c.temperature_2m),
      humidity: num(c.relative_humidity_2m),
      pressure: num(c.surface_pressure),
      weather: wmoToWeather(num(c.weather_code)),
      observedAt: typeof c.time === 'string' ? c.time : null,
    };
  } catch {
    // 圏外・タイムアウト・CORS いずれも「取れなかった」に畳む
    return empty;
  } finally {
    clearTimeout(timer);
  }
}

/** 端末の現在地を取得する。拒否・非対応・タイムアウトはすべて null */
export function getCurrentPosition(timeoutMs = 8000): Promise<LatLon | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
}
