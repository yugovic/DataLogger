import React from 'react';
import { Card, Tag, Tooltip } from 'antd';
import { CalendarOutlined, CarOutlined, EnvironmentOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import { CarSetup } from '../../types/setup';

interface SetupCardProps {
  setup: CarSetup;
}

export const SetupCard: React.FC<SetupCardProps> = ({ setup }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'practice':
        return { label: '練習走行', color: 'blue' };
      case 'qualifying':
        return { label: '予選', color: 'orange' };
      case 'race':
        return { label: 'レース', color: 'red' };
      default:
        return { label: '不明', color: 'default' };
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case '晴れ':
        return '☀️';
      case '曇り':
        return '☁️';
      case '雨':
        return '🌧️';
      case 'ウェット':
        return '🌧️';
      case 'フルウェット':
        return '⛈️';
      default:
        return '🌤️';
    }
  };

  const sessionType = getSessionTypeLabel(setup.sessionType);
  const knowledgeItems = [
    { label: '意図', value: setup.knowledge?.intention },
    { label: '結果', value: setup.knowledge?.result },
    { label: '学び', value: setup.knowledge?.learning }
  ]
    .map((item) => ({ ...item, value: item.value?.trim() }))
    .filter((item) => item.value);
  const summarizeText = (value: string, maxLength = 44) => {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}…`;
  };

  return (
    <Card
      hoverable
      className="shadow-sm hover:shadow-md transition-shadow"
      styles={{ body: { padding: '16px' } }}
    >
      <div className="space-y-3">
        {/* ヘッダー：日付とアクションボタン */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
              <CalendarOutlined className="mr-2" />
              <span className="text-sm dark:text-gray-300">{formatDate(setup.date)}</span>
            </div>
            <Tag color={sessionType.color} className="ml-6">{sessionType.label}</Tag>
          </div>
          <div className="flex gap-1">
            <Tooltip title="編集">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/setup/${setup.id}`;
                }}
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
              >
                <EditOutlined style={{ fontSize: '16px' }} />
              </button>
            </Tooltip>
            <Tooltip title="コピーして新規作成">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/?copy=${setup.id}`;
                }}
                className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md transition-colors"
              >
                <CopyOutlined style={{ fontSize: '16px' }} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* メイン情報 */}
        <div>
          <div className="flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium text-lg mb-1">
            <div className="flex items-center">
              <EnvironmentOutlined className="mr-2 text-blue-500 dark:text-blue-400" />
              {setup.circuit}
            </div>
            <div className="text-base font-bold text-green-600 dark:text-green-400">
              {setup.lapTimeData?.bestLap ? setup.lapTimeData.bestLap : '-'}
            </div>
          </div>
          <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm ml-6">
            <CarOutlined className="mr-2" />
            {setup.carModel}
          </div>
        </div>

        {/* コンディション情報 */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getWeatherIcon(setup.weather.condition ?? '')}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {setup.weather.airTemp != null ? `${setup.weather.airTemp}°C` : '—'} / {setup.weather.trackTemp != null ? `${setup.weather.trackTemp}°C` : '—'}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {setup.tireInfo.brand || '—'} {setup.tireInfo.compound || ''}
          </span>
        </div>

        {knowledgeItems.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 mb-2">知見メモ</div>
            <div className="space-y-2">
              {knowledgeItems.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {summarizeText(item.value as string)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
