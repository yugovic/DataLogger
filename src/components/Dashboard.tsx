import React, { useState } from 'react';
import { Header } from './common/Header';

export const Dashboard: React.FC = () => {
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      
      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ダッシュボード</h2>
          <p className="text-gray-600">走行データの統計とサマリーを確認できます</p>
        </div>

        {/* ダッシュボードコンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center text-gray-500 py-12">
            ダッシュボードコンテンツがここに表示されます
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white py-6 border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            © 2025 VELOCITY LOGGER. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};