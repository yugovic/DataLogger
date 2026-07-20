// セットアップ比較ビュー — 同一ユーザーの2セットアップを左右（モバイルは上下）で比較する。
//
// ルート: /compare?a={id}&b={id}
// 差分のある項目をハイライトし、数値は差分値（+5 等）も表示する。
// null 値は「—」と表示し、決して 0 や偽値に変換しない。

import React, { useEffect, useMemo, useState } from 'react';
import { Spin, Empty, message } from 'antd';
import { LoadingOutlined, SwapOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSetup } from '../../services/setupService';
import { CarSetup } from '../../types/setup';
import { Header } from '../common/Header';
import {
  buildCompareSections,
  resolveCompareSections,
  compareRow,
  compareBestLaps,
  formatDelta,
  CompareRow,
  DiffKind,
} from '../../lib/setupFields';
import { trackEvent } from '../../lib/analytics';
import logger from '../../utils/logger';
import { SpecCard } from '../vehicle/SpecCard';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import { formatDateTime } from '../../i18n/formatters';

// 差分種別ごとのセル背景クラス（ダークモード対応）
function cellClass(kind: DiffKind, side: 'a' | 'b'): string {
  switch (kind) {
    case 'changed':
      // 変更あり = 黄系
      return 'bg-yellow-50 dark:bg-yellow-900/20';
    case 'only-a':
      return side === 'a'
        ? 'bg-yellow-50 dark:bg-yellow-900/20'
        : 'bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500';
    case 'only-b':
      return side === 'b'
        ? 'bg-yellow-50 dark:bg-yellow-900/20'
        : 'bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500';
    case 'both-null':
      return 'text-gray-400 dark:text-gray-500';
    case 'same':
    default:
      return '';
  }
}

export const SetupCompare: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  const params = new URLSearchParams(location.search);
  const idA = params.get('a');
  const idB = params.get('b');

  const [setupA, setSetupA] = useState<CarSetup | null>(null);
  const [setupB, setSetupB] = useState<CarSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      if (!idA || !idB) {
        setLoadError(t('compare.errors.missingIds'));
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [a, b] = await Promise.all([getSetup(idA), getSetup(idB)]);
        if (!a || !b) {
          setLoadError(t('compare.errors.notFound'));
          return;
        }
        // 他人のデータは比較しない（所有者チェック）
        if (a.userId !== currentUser.uid || b.userId !== currentUser.uid) {
          setLoadError(t('compare.errors.forbidden'));
          return;
        }
        setSetupA(a);
        setSetupB(b);
        // 計測: 比較実行（個人情報は渡さない）
        trackEvent('comparison_viewed', { circuit: a.circuit, car_model: a.carModel });
      } catch (error) {
        logger.error('比較データの読み込みに失敗しました:', error);
        setLoadError(t('compare.errors.load'));
        message.error(t('compare.errors.load'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, idA, idB, t]);

  const sections = useMemo(
    () => resolveCompareSections(buildCompareSections(setupA && setupB ? [setupA, setupB] : []), t),
    [setupA, setupB, t],
  );

  // ベストラップの勝者バッジ判定
  const lapWinner = useMemo(() => {
    if (!setupA || !setupB) return null;
    return compareBestLaps(setupA.lapTimeData?.bestLap, setupB.lapTimeData?.bestLap);
  }, [setupA, setupB]);

  const swap = () => {
    if (!idA || !idB) return;
    navigate(`/compare?a=${idB}&b=${idA}`, { replace: true });
  };

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

  if (loadError || !setupA || !setupB) {
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
            onClick={() => navigate('/history')}
            className="flex items-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-6"
          >
            <ArrowLeftOutlined className="mr-1" />
            {t('compare.back')}
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty description={<span className="text-gray-500 dark:text-gray-400">{loadError ?? t('compare.unavailable')}</span>} />
          </div>
        </main>
      </div>
    );
  }

  // 比較対象が異なる車種の場合の注意表示
  const sameCarModel = setupA.carModel === setupB.carModel;
  const hasVehicleConditionDiff =
    setupA.vehicleProfileSnapshot &&
    setupB.vehicleProfileSnapshot &&
    (
      setupA.vehicleProfileSnapshot.tireClass !== setupB.vehicleProfileSnapshot.tireClass ||
      setupA.vehicleProfileSnapshot.modLevel !== setupB.vehicleProfileSnapshot.modLevel
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mb-4"
        >
          <ArrowLeftOutlined className="mr-1" />
          {t('compare.back')}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('compare.title')}</h2>
          <button
            onClick={swap}
            className="flex items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md text-sm"
          >
            <SwapOutlined className="mr-2" />
            {t('compare.swap')}
          </button>
        </div>

        {!sameCarModel && (
          <div className="mb-4 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-md">
            {t('compare.differentVehicles', { a: setupA.carModel, b: setupB.carModel })}
          </div>
        )}

        {hasVehicleConditionDiff && (
          <div className="mb-4 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-md">
            {t('compare.differentConditions')}
          </div>
        )}

        {/* 黄色 = 差分あり / 「—」= 未入力 の凡例 */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700"></span>
            {t('compare.changed')}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium">—</span>
            {t('compare.empty')}
          </span>
        </div>

        {/* 比較ヘッダー（A / B のラベル） */}
        <div className="grid grid-cols-[minmax(7rem,1fr)_1fr_1fr] sm:grid-cols-[minmax(10rem,1fr)_1fr_1fr] gap-px bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden sticky top-0 z-10">
          <div className="bg-gray-100 dark:bg-gray-800 px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('compare.item')}
          </div>
          {[setupA, setupB].map((s, i) => {
            const isWinner = lapWinner === (i === 0 ? 'a' : 'b');
            return (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {i === 0 ? 'A' : 'B'}
                  </span>
                  {isWinner && (
                    <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                      {t('compare.fastest')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{formatDateTime(s.date, locale)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 truncate">{s.circuit}</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                  {s.carModel} · {t(`common.sessionType.${s.sessionType}`)}
                </div>
                {s.vehicleProfileSnapshot && (
                  <div className="mt-2">
                    <SpecCard
                      carModel={s.carModel}
                      profile={s.vehicleProfileSnapshot}
                      variant="compact"
                      ownerLabel={s.driver}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* セクションごとの比較行 */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm overflow-hidden">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                {section.title}
              </div>
              {section.rows.map((row: CompareRow) => {
                const result = compareRow(row, setupA, setupB);
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-[minmax(7rem,1fr)_1fr_1fr] sm:grid-cols-[minmax(10rem,1fr)_1fr_1fr] gap-px bg-gray-100 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                  >
                    <div className="bg-white dark:bg-gray-800 px-3 py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      {row.label}
                    </div>
                    <div className={`bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 flex items-center ${cellClass(result.kind, 'a')}`}>
                      {result.aDisplay}
                    </div>
                    <div className={`bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 flex items-center justify-between gap-2 ${cellClass(result.kind, 'b')}`}>
                      <span>{result.bDisplay}</span>
                      {result.delta !== null && result.delta !== 0 && (
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            result.delta > 0 ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
                          }`}
                        >
                          {formatDelta(result.delta)}
                          {row.unit ? ` ${row.unit}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          {t('compare.deltaHint')}
        </p>
      </main>
    </div>
  );
};

export default SetupCompare;
