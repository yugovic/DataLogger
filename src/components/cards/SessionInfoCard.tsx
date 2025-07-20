import React from 'react';
import { CalendarOutlined, CarOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';

interface SessionInfoCardProps {
  circuit: string;
  carModel: string;
  sessionType: 'practice' | 'qualifying' | 'race';
  setCircuit: (circuit: string) => void;
  setCarModel: (carModel: string) => void;
  setSessionType: (type: 'practice' | 'qualifying' | 'race') => void;
}

export const SessionInfoCard: React.FC<SessionInfoCardProps> = ({
  circuit,
  carModel,
  sessionType,
  setCircuit,
  setCarModel,
  setSessionType
}) => {
  const circuits = [
    '鈴鹿サーキット',
    '富士スピードウェイ',
    'ツインリンクもてぎ',
    '岡山国際サーキット',
    'オートポリス',
    'スポーツランドSUGO',
    '筑波サーキット'
  ];

  const cars = [
    'Honda S2000',
    'Mazda RX-7',
    'Nissan Skyline GT-R',
    'Toyota Supra',
    'Subaru WRX STI',
    'Mitsubishi Lancer Evolution'
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">セッション情報</h3>
      </div>

      {/* コンテンツ */}
      <div className="p-6 space-y-4">
        {/* 日時 */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
          <CalendarOutlined className="text-xl text-gray-400" />
          <div className="flex-1">
            <div className="text-sm text-gray-500">日時</div>
            <div className="font-medium text-gray-900">
              {new Date().toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
          <ClockCircleOutlined className="text-xl text-gray-400" />
          <div className="text-right">
            <div className="text-sm text-gray-500">時刻</div>
            <div className="font-medium text-gray-900">
              {new Date().toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        {/* サーキット */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <EnvironmentOutlined />
            サーキット
          </label>
          <select
            value={circuit}
            onChange={(e) => setCircuit(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
          >
            {circuits.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 車両 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CarOutlined />
            車両
          </label>
          <select
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
          >
            {cars.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* セッションタイプ */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            セッションタイプ
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSessionType('practice')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                sessionType === 'practice'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              練習走行
            </button>
            <button
              onClick={() => setSessionType('qualifying')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                sessionType === 'qualifying'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              予選
            </button>
            <button
              onClick={() => setSessionType('race')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                sessionType === 'race'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              レース
            </button>
          </div>
        </div>

        {/* 天候条件 */}
        <div className="pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">路面温度</label>
              <input
                type="text"
                placeholder="32°C"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">気温</label>
              <input
                type="text"
                placeholder="28°C"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};