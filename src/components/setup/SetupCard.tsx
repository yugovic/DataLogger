import React from 'react';
import { Card, Tag } from 'antd';
import { CalendarOutlined, CarOutlined, CloudOutlined, FieldTimeOutlined, DashboardOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { CarSetup } from '../../types/setup';

interface SetupCardProps {
  setup: CarSetup;
}

export const SetupCard: React.FC<SetupCardProps> = ({ setup }) => {
  const handleCardClick = () => {
    window.location.href = `/setup/${setup.id}`;
  };
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

  return (
    <Card
      hoverable
      onClick={handleCardClick}
      className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      bodyStyle={{ padding: '20px' }}
    >
      <div className="space-y-4">
        {/* 日付とセッションタイプ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <CalendarOutlined className="mr-2" />
            <span className="text-sm">{formatDate(setup.date)}</span>
          </div>
          <Tag color={sessionType.color}>{sessionType.label}</Tag>
        </div>

        {/* サーキット */}
        <div className="flex items-center text-gray-800">
          <EnvironmentOutlined className="mr-2 text-blue-500" />
          <span className="font-medium">{setup.circuit}</span>
        </div>

        {/* 車種 */}
        <div className="flex items-center text-gray-700">
          <CarOutlined className="mr-2 text-gray-500" />
          <span>{setup.carModel}</span>
        </div>

        {/* 天気情報 */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center">
            <CloudOutlined className="mr-2 text-blue-500" />
            <span className="text-sm">
              {getWeatherIcon(setup.weather.condition)} {setup.weather.condition}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <span>{setup.weather.airTemp}°C / {setup.weather.trackTemp}°C</span>
          </div>
        </div>

        {/* タイヤ情報 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">タイヤ</span>
            <span className="text-sm text-blue-600">
              {setup.tireInfo.brand} {setup.tireInfo.compound}
            </span>
          </div>
        </div>

        {/* セッション情報 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <FieldTimeOutlined className="mr-1" />
              <span className="text-xs">周回数</span>
            </div>
            <span className="text-lg font-semibold text-gray-800">
              {Math.floor(setup.sessionInfo.distance / 5.8)} 周
            </span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center text-gray-500 mb-1">
              <DashboardOutlined className="mr-1" />
              <span className="text-xs">走行距離</span>
            </div>
            <span className="text-lg font-semibold text-gray-800">
              {setup.sessionInfo.distance} km
            </span>
          </div>
        </div>

        {/* ベストラップ（仮のデータ） */}
        <div className="border-t pt-3">
          <div className="text-center">
            <span className="text-xs text-gray-500">ベストラップ</span>
            <div className="text-xl font-bold text-green-600">1:58.423</div>
          </div>
        </div>
      </div>
    </Card>
  );
};