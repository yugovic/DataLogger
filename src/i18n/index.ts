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

export default i18n;
