export const SUPPORTED_LOCALES = ['ja-JP', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'ja-JP';
export const LOCALE_STORAGE_KEY = 'velocity-logger.locale';

export const normalizeLocale = (value: string | null | undefined): SupportedLocale | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace('_', '-');
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja-JP';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return null;
};

const getQueryLocale = (): SupportedLocale | null => {
  if (typeof window === 'undefined') return null;
  return normalizeLocale(new URLSearchParams(window.location.search).get('lang'));
};

const getStoredLocale = (): SupportedLocale | null => {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
};

const getBrowserLocale = (): SupportedLocale | null => {
  if (typeof navigator === 'undefined') return null;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }
  return null;
};

export const detectInitialLocale = (): SupportedLocale =>
  getQueryLocale() ?? getStoredLocale() ?? getBrowserLocale() ?? DEFAULT_LOCALE;

export const persistLocale = (locale: SupportedLocale): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable in privacy-restricted contexts.
  }
};

