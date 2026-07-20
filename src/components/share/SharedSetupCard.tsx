// 共有ブラウズ用のカード（読み取り専用）。
//
// 自分のデータ用 SetupCard は編集・コピー・共有トグル等オーナー操作を持つため、
// 他人の共有データには使わない。ここでは日付・サーキット・車種・天候・ベスト
// ラップ・証憑バッジのみを示し、クリックで読み取り専用詳細へ遷移する。
// anonymized ならドライバー名は表示しない。

import React from 'react';
import { Card, Tag } from 'antd';
import { CalendarOutlined, CarOutlined, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { CarSetup } from '../../types/setup';
import { sessionTypeTranslationKey } from '../../lib/setupFields';
import { AnonymizedBadge, LoggerEvidenceBadge } from './ShareBadges';
import { hasLoggerEvidence } from './shareUtils';
import { SpecCard } from '../vehicle/SpecCard';
import { normalizeWeather } from '../../lib/weather';
import { useTranslation } from 'react-i18next';

interface SharedSetupCardProps {
  setup: CarSetup;
  onOpen: (id: string) => void;
}

const sessionColor = (type: CarSetup['sessionType']): string => {
  switch (type) {
    case 'practice':
      return 'blue';
    case 'qualifying':
      return 'orange';
    case 'race':
      return 'red';
    default:
      return 'default';
  }
};

const weatherIcon = (condition: string | null | undefined): string => {
  switch (normalizeWeather(condition)) {
    case 'sunny':
      return '☀️';
    case 'cloudy':
      return '☁️';
    case 'wet':
      return '🌧️';
    case 'full_wet':
      return '⛈️';
    default:
      return '🌤️';
  }
};

const formatDate = (date: Date): string =>
  new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

export const SharedSetupCard: React.FC<SharedSetupCardProps> = ({ setup, onOpen }) => {
  const { t } = useTranslation();
  return (
    <Card
      hoverable
      className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      styles={{ body: { padding: '16px' } }}
      onClick={() => setup.id && onOpen(setup.id)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
              <CalendarOutlined className="mr-2" />
              <span className="text-sm dark:text-gray-300">{formatDate(setup.date)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag color={sessionColor(setup.sessionType)} className="!mr-0">
                {t(sessionTypeTranslationKey(setup.sessionType))}
              </Tag>
              {setup.anonymized && <AnonymizedBadge />}
              {hasLoggerEvidence(setup) && <LoggerEvidenceBadge />}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium text-lg mb-1">
            <div className="flex items-center">
              <EnvironmentOutlined className="mr-2 text-blue-500 dark:text-blue-400" />
              {setup.circuit}
            </div>
            <div className="text-base font-bold text-green-600 dark:text-green-400">
              {setup.lapTimeData?.bestLap ? setup.lapTimeData.bestLap : '—'}
            </div>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm">
            <div className="flex items-center">
              <CarOutlined className="mr-2" />
              {setup.carModel}
            </div>
            {/* 匿名データはドライバー非表示。非匿名で driver があれば表示 */}
            {!setup.anonymized && setup.driver && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <UserOutlined className="mr-1" />
                {setup.driver}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md">
          <div className="flex items-center gap-3">
            <span className="text-lg">{weatherIcon(setup.weather.condition)}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {setup.weather.airTemp != null ? `${setup.weather.airTemp}°C` : '—'} / {setup.weather.trackTemp != null ? `${setup.weather.trackTemp}°C` : '—'}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {setup.tireInfo.productName || setup.tireInfo.brand || '—'} {setup.tireInfo.compound || ''}
          </span>
        </div>

        {setup.vehicleProfileSnapshot && (
          <SpecCard
            carModel={setup.carModel}
            profile={setup.vehicleProfileSnapshot}
            variant="compact"
            ownerLabel={setup.anonymized ? null : setup.driver}
          />
        )}
      </div>
    </Card>
  );
};
