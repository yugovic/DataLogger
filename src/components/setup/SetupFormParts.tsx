import React from 'react';
import { useTranslation } from 'react-i18next';

export const setupFieldLabelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';
export const setupFieldHintClass = 'mt-1 text-xs text-gray-500 dark:text-gray-400';

interface SetupSectionProps {
  title: string;
  icon: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}

/** セットアップ各タブで共通の設定面。色・余白・見出し階層をここで固定する。 */
export const SetupSection: React.FC<SetupSectionProps> = ({ title, icon, meta, children, className = '' }) => (
  <section className={`rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 sm:p-6 ${className}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center">
        <i className={`${icon} mr-2 text-blue-500 dark:text-blue-400`} aria-hidden="true" />
        <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 sm:text-lg">{title}</h3>
      </div>
      {meta && <span className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{meta}</span>}
    </div>
    {children}
  </section>
);

interface SetupFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}

export const SetupField: React.FC<SetupFieldProps> = ({ label, children, hint }) => (
  <div>
    <label className={setupFieldLabelClass}>{label}</label>
    {children}
    {hint && <p className={setupFieldHintClass}>{hint}</p>}
  </div>
);

interface AxleFieldPairProps {
  front: React.ReactNode;
  rear: React.ReactNode;
  frontHint?: React.ReactNode;
  rearHint?: React.ReactNode;
}

/** 前後軸入力のレスポンシブ配置とラベルを統一する。 */
export const AxleFieldPair: React.FC<AxleFieldPairProps> = ({ front, rear, frontHint, rearHint }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SetupField label={t('setup.front')} hint={frontHint}>{front}</SetupField>
      <SetupField label={t('setup.rear')} hint={rearHint}>{rear}</SetupField>
    </div>
  );
};

export const SetupEmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
    {children}
  </div>
);
