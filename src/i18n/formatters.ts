import type { SupportedLocale } from './locale';

export const formatDate = (
  value: Date | number | string,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' },
): string => new Intl.DateTimeFormat(locale, options).format(new Date(value));

export const formatDateTime = (
  value: Date | number | string,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
): string => formatDate(value, locale, options);

export const formatNumber = (
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(locale, options).format(value);

export const formatCurrency = (
  value: number,
  locale: SupportedLocale,
  currency = 'JPY',
): string => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);

