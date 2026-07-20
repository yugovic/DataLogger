import type { LegacyWeatherType, WeatherCode, WeatherType } from '../types/setup';

const LEGACY_WEATHER_CODES: Record<LegacyWeatherType, WeatherCode> = {
  晴れ: 'sunny',
  曇り: 'cloudy',
  ウェット: 'wet',
  フルウェット: 'full_wet',
};

const WEATHER_CODE_LEGACY_LABELS: Record<WeatherCode, LegacyWeatherType> = {
  sunny: '晴れ',
  cloudy: '曇り',
  wet: 'ウェット',
  full_wet: 'フルウェット',
};

export const WEATHER_CODES = ['sunny', 'cloudy', 'wet', 'full_wet'] as const;
export const LEGACY_WEATHER_VALUES = ['晴れ', '曇り', 'ウェット', 'フルウェット'] as const;

export const normalizeWeather = (value: WeatherType | string | null | undefined): WeatherCode | null => {
  if (!value) return null;
  if ((WEATHER_CODES as readonly string[]).includes(value)) return value as WeatherCode;
  if ((LEGACY_WEATHER_VALUES as readonly string[]).includes(value)) {
    return LEGACY_WEATHER_CODES[value as LegacyWeatherType];
  }
  return null;
};

export const isWetWeather = (value: WeatherType | string | null | undefined): boolean => {
  const code = normalizeWeather(value);
  return code === 'wet' || code === 'full_wet';
};

/** 既存の日本語 CSV と未移行画面向けの互換表示。 */
export const legacyWeatherLabel = (value: WeatherType | string | null | undefined): LegacyWeatherType | null => {
  const code = normalizeWeather(value);
  return code ? WEATHER_CODE_LEGACY_LABELS[code] : null;
};

export const weatherTranslationKey = (
  value: WeatherType | string | null | undefined,
): `weather.${WeatherCode}` | null => {
  const code = normalizeWeather(value);
  return code ? `weather.${code}` : null;
};
