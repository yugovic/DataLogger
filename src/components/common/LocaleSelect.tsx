import React from 'react';
import { GlobalOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import type { SupportedLocale } from '../../i18n/locale';

interface LocaleSelectProps {
  className?: string;
  showDescription?: boolean;
}

export const LocaleSelect: React.FC<LocaleSelectProps> = ({
  className = '',
  showDescription = false,
}) => {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocale();

  return (
    <div className={className}>
      {showDescription ? (
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <GlobalOutlined aria-hidden="true" />
          {t('language')}
        </label>
      ) : (
        <label className="sr-only">{t('language')}</label>
      )}
      <Select
        value={locale}
        onChange={(value: SupportedLocale) => void setLocale(value)}
        className="w-full min-w-28"
        aria-label={t('language')}
        options={[
          { value: 'ja-JP', label: t('japanese') },
          { value: 'en', label: t('english') },
        ]}
      />
      {showDescription && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t('languageDescription')}
        </p>
      )}
    </div>
  );
};
