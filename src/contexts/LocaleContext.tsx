import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  detectInitialLocale,
  normalizeLocale,
  persistLocale,
  type SupportedLocale,
} from '../i18n/locale';
import { getUserProfile, updateUserLocale } from '../services/profileService';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation('common');
  const [locale, setLocaleState] = useState<SupportedLocale>(() => detectInitialLocale());

  const applyLocale = useCallback(async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
    await i18n.changeLanguage(nextLocale);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    getUserProfile(currentUser.uid)
      .then((profile) => {
        const profileLocale = normalizeLocale(profile.locale);
        if (!cancelled && profileLocale) {
          void applyLocale(profileLocale);
        }
      })
      .catch((error) => logger.error('Failed to load user locale:', error));
    return () => { cancelled = true; };
  }, [currentUser, applyLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (!window.location.pathname.startsWith('/s/')) {
      document.title = t('appName');
    }
  }, [locale, t]);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    await applyLocale(nextLocale);
    if (window.location.pathname.startsWith('/s/')) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', nextLocale);
      window.history.replaceState(window.history.state, '', url);
    }
    if (currentUser) {
      try {
        await updateUserLocale(currentUser.uid, nextLocale);
      } catch (error) {
        logger.error('Failed to persist user locale:', error);
      }
    }
  }, [applyLocale, currentUser]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  const antLocale = locale === 'ja-JP' ? jaJP : enUS;

  return (
    <LocaleContext.Provider value={value}>
      <ConfigProvider locale={antLocale}>{children}</ConfigProvider>
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextValue => {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
};
