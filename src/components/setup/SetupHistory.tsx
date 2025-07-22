import React, { useState, useEffect } from 'react';
import { Empty, Spin, message } from 'antd';
import { LoadingOutlined, CalendarOutlined, CarOutlined, CloudOutlined, FieldTimeOutlined, DashboardOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSetups } from '../../services/setupService';
import { CarSetup } from '../../types/setup';
import { SetupCard } from './SetupCard';
import { Header } from '../common/Header';

export const SetupHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [setups, setSetups] = useState<CarSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  useEffect(() => {
    const fetchSetups = async () => {
      if (!currentUser) return;

      try {
        const userSetups = await getUserSetups(currentUser.uid, 50);
        setSetups(userSetups);
      } catch (error) {
        console.error('Error fetching setups:', error);
        message.error('履歴データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchSetups();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">走行履歴</h2>
          <p className="text-gray-600">過去の走行データとセットアップ情報を確認できます</p>
        </div>

        {setups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <Empty
              description={
                <span className="text-gray-500">
                  まだ走行データがありません<br />
                  新しいセットアップを記録してください
                </span>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {setups.map((setup) => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
          </div>
        )}
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