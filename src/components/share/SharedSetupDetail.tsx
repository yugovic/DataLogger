// 共有セットアップの読み取り専用 詳細表示。
//
// ルート: /shared/:id
// 自分のデータ専用の /compare（所有者チェックあり）とは別系統。ここでは
// 他人の shared データを buildCompareSections で網羅的に1列表示する。
// 取得は getSharedSetup（visibility!=='shared' は弾く）。ルール上、他人の
// private は read 自体が拒否される（= 表示不能）ことが相互性の最終防壁。

import React, { useEffect, useState } from 'react';
import { Spin, Empty, message } from 'antd';
import { LoadingOutlined, ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSharedSetup, getUserSetups } from '../../services/setupService';
import { CarSetup } from '../../types/setup';
import { Header } from '../common/Header';
import {
  buildCompareSections,
  displayValue,
  resolveCompareSections,
  sessionTypeTranslationKey,
} from '../../lib/setupFields';
import { SharedBadge, AnonymizedBadge, LoggerEvidenceBadge } from './ShareBadges';
import { hasLoggerEvidence } from './shareUtils';
import logger from '../../utils/logger';
import { SpecCard } from '../vehicle/SpecCard';
import { useTranslation } from 'react-i18next';

const formatDate = (date: Date): string => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.toLocaleDateString('ja-JP')} ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
};

export const SharedSetupDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  const [setup, setSetup] = useState<CarSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 自分の同一車種データがあれば「自分のデータと比較」導線を出す
  const [myComparableId, setMyComparableId] = useState<string | null>(null);

  const sections = resolveCompareSections(buildCompareSections(setup ? [setup] : []), t);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      if (!id) {
        setLoadError(t('share.detail.notSpecified'));
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const s = await getSharedSetup(id);
        if (!s) {
          setLoadError(t('share.detail.forbidden'));
          return;
        }
        setSetup(s);

        // 自分の同一車種の最新データを比較候補にする（任意導線）
        try {
          const mine = await getUserSetups(currentUser.uid, 50);
          const sameModel = mine.find((m) => m.carModel === s.carModel && m.id);
          setMyComparableId(sameModel?.id ?? null);
        } catch {
          // 比較候補が取れなくても詳細表示は続行
          setMyComparableId(null);
        }
      } catch (error) {
        // ルールが他人の private を拒否した場合等もここに来る
        logger.error('共有データの読み込みに失敗しました:', error);
        setLoadError(t('share.detail.loadError'));
        message.error(t('share.detail.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          settingsModal={settingsModal}
          setSettingsModal={setSettingsModal}
          currentSettingView={currentSettingView}
          setCurrentSettingView={setCurrentSettingView}
        />
        <div className="flex items-center justify-center h-96">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        </div>
      </div>
    );
  }

  if (loadError || !setup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          settingsModal={settingsModal}
          setSettingsModal={setSettingsModal}
          currentSettingView={currentSettingView}
          setCurrentSettingView={setCurrentSettingView}
        />
        <main className="max-w-4xl mx-auto py-6 px-4">
          <button
            onClick={() => navigate('/shared')}
            className="flex items-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-6"
          >
            <ArrowLeftOutlined className="mr-1" />
            {t('share.detail.back')}
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty description={<span className="text-gray-500 dark:text-gray-400">{loadError ?? t('share.detail.cannotDisplay')}</span>} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/shared')}
          className="flex items-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-4"
        >
          <ArrowLeftOutlined className="mr-1" />
          {t('share.detail.back')}
        </button>

        {/* ヘッダー情報 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SharedBadge />
            {setup.anonymized && <AnonymizedBadge />}
            {hasLoggerEvidence(setup) && <LoggerEvidenceBadge />}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{setup.circuit}</h2>
          <div className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
            {setup.carModel} · {t(sessionTypeTranslationKey(setup.sessionType))} · {formatDate(setup.date)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              {t('share.detail.bestLap')}:{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {displayValue(setup.lapTimeData?.bestLap)}
              </span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {t('share.detail.driver')}: {setup.anonymized ? t('share.detail.anonymous') : displayValue(setup.driver)}
            </span>
          </div>
          {myComparableId && setup.id && (
            <button
              onClick={() => navigate(`/compare?a=${myComparableId}&b=${setup.id}`)}
              className="mt-4 inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-2 rounded-md text-sm transition-colors"
            >
              <SwapOutlined className="mr-2" />
              {t('share.detail.compareCta')}
            </button>
          )}
        </div>

        {setup.vehicleProfileSnapshot && (
          <div className="mb-4">
            <SpecCard
              carModel={setup.carModel}
              profile={setup.vehicleProfileSnapshot}
              variant="full"
              ownerLabel={setup.anonymized ? null : setup.driver}
            />
          </div>
        )}

        {/* 全セッティング（読み取り専用・網羅表示） */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="bg-gray-50 dark:bg-gray-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                {section.title}
              </div>
              {section.rows.map((row) => {
                const val = row.get(setup);
                const empty = val === null || val === undefined || val === '';
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[minmax(8rem,1fr)_1fr] gap-px bg-gray-100 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                  >
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      {row.label}
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-800 dark:text-gray-200 flex items-center">
                      {displayValue(val, !empty ? row.unit : undefined)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 知見メモ（あれば） */}
        {(setup.knowledge?.intention || setup.knowledge?.result || setup.knowledge?.learning) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 mt-4">
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-3">{t('share.detail.knowledge')}</div>
            <div className="space-y-2 text-sm">
              {setup.knowledge?.intention && (
                <div><span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">{t('share.detail.intention')}</span><span className="text-gray-700 dark:text-gray-200">{setup.knowledge.intention}</span></div>
              )}
              {setup.knowledge?.result && (
                <div><span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">{t('share.detail.result')}</span><span className="text-gray-700 dark:text-gray-200">{setup.knowledge.result}</span></div>
              )}
              {setup.knowledge?.learning && (
                <div><span className="font-semibold text-gray-500 dark:text-gray-400 mr-2">{t('share.detail.learning')}</span><span className="text-gray-700 dark:text-gray-200">{setup.knowledge.learning}</span></div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedSetupDetail;
