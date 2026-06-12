import React, { useState } from 'react';
import { message, Tabs } from 'antd';
import { SaveOutlined, HistoryOutlined, SettingOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { TirePressureCard } from './cards/TirePressureCard';
import { ModernDamperCard } from './cards/ModernDamperCard';
import { SessionInfoCard } from './cards/SessionInfoCard';

export const ModernCarSetupMain: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // セッション情報
  const [circuit, setCircuit] = useState('鈴鹿サーキット');
  const [carModel, setCarModel] = useState('Honda S2000');
  const [sessionType, setSessionType] = useState<'practice' | 'qualifying' | 'race'>('practice');

  // タイヤ圧
  const [tirePressures, setTirePressures] = useState({
    fl: { before: "190", after: "215", diff: "+25" },
    fr: { before: "190", after: "218", diff: "+28" },
    rl: { before: "185", after: "210", diff: "+25" },
    rr: { before: "185", after: "213", diff: "+28" }
  });

  // ダンパー設定
  const [damperSettings, setDamperSettings] = useState({
    fl: { bump: 8, rebound: 10 },
    fr: { bump: 8, rebound: 10 },
    rl: { bump: 7, rebound: 9 },
    rr: { bump: 7, rebound: 9 }
  });

  // ドライビングノート
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 保存処理をここに実装
      await new Promise(resolve => setTimeout(resolve, 1000)); // 仮の遅延
      message.success('セットアップデータを保存しました');
    } catch (error) {
      message.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      window.location.href = '/auth';
    }
  };

  const tabItems = [
    {
      key: 'basic',
      label: (
        <span className="flex items-center gap-2">
          <SettingOutlined />
          基本設定
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SessionInfoCard
            circuit={circuit}
            carModel={carModel}
            sessionType={sessionType}
            setCircuit={setCircuit}
            setCarModel={setCarModel}
            setSessionType={setSessionType}
          />
          <TirePressureCard
            tirePressures={tirePressures}
            setTirePressures={setTirePressures}
          />
          <div className="lg:col-span-2">
            <ModernDamperCard
              damperSettings={damperSettings}
              setDamperSettings={setDamperSettings}
            />
          </div>
        </div>
      )
    },
    {
      key: 'driving',
      label: (
        <span className="flex items-center gap-2">
          <FileTextOutlined />
          ドライビングノート
        </span>
      ),
      children: (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ドライビングノート</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-64 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="走行の感想、改善点、次回への課題などを記録..."
          />
        </div>
      )
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-2">
          <HistoryOutlined />
          履歴
        </span>
      ),
      children: (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">セットアップ履歴</h3>
          <p className="text-gray-500">履歴データはまだありません。</p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold">
              <span className="text-blue-600">VELOCITY</span>
              <span className="text-gray-900 ml-1">LOGGER</span>
            </h1>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{currentUser?.email}</span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <SaveOutlined />
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          defaultActiveKey="basic"
          items={tabItems}
          className="modern-tabs"
        />
      </main>
    </div>
  );
};