import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectInitialLocale } from './locale';
import { resources } from './resources';

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLocale(),
  fallbackLng: 'ja-JP',
  supportedLngs: ['ja-JP', 'en'],
  defaultNS: 'common',
  ns: ['common', 'auth', 'header', 'setup', 'setupTabs', 'onboarding', 'history', 'vehicle', 'compare', 'dashboard', 'share', 'errors', 'telemetry'],
  nsSeparator: '.',
  keySeparator: '.',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// 開発ビルド時のみ、疑似ロケール品質ゲート（tests/pseudo-locale.spec.ts）が
// ブラウザ側から addResourceBundle / changeLanguage を呼べるよう i18n を公開する。
// 本番ビルドでは公開しない。
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __i18n?: typeof i18n }).__i18n = i18n;
}

export default i18n;
