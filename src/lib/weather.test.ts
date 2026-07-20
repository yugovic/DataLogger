import { describe, expect, it } from 'vitest';
import { isWetWeather, legacyWeatherLabel, normalizeWeather, weatherTranslationKey } from './weather';

describe('weather compatibility', () => {
  it.each([
    ['晴れ', 'sunny'],
    ['曇り', 'cloudy'],
    ['ウェット', 'wet'],
    ['フルウェット', 'full_wet'],
    ['sunny', 'sunny'],
    ['full_wet', 'full_wet'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeWeather(input)).toBe(expected);
  });

  it('does not infer unknown weather', () => {
    expect(normalizeWeather('rain')).toBeNull();
    expect(weatherTranslationKey(null)).toBeNull();
  });

  it('recognizes legacy and canonical wet values', () => {
    expect(isWetWeather('ウェット')).toBe(true);
    expect(isWetWeather('full_wet')).toBe(true);
    expect(isWetWeather('sunny')).toBe(false);
  });

  it('preserves the existing Japanese export label', () => {
    expect(legacyWeatherLabel('sunny')).toBe('晴れ');
    expect(legacyWeatherLabel('フルウェット')).toBe('フルウェット');
  });
});
