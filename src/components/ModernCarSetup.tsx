// モダンな車両セットアップコンポーネント
import React, { useState } from 'react';
import { message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { saveSetup, getUserSetups } from '../services/setupService';
import { CarSetup as CarSetupType } from '../types/setup';
import { ModernLayout } from './layouts/ModernLayout';
import { ModernTabs } from './ui/ModernTabs';
import { ModernButton } from './ui/ModernButton';
import { ModernTirePressureCard } from './setup/cards/ModernTirePressureCard';
import { DamperCard } from './setup/cards/DamperCard';
import { SuspensionTab } from './setup/tabs/SuspensionTab';
import { DrivingTab } from './setup/tabs/DrivingTab';

export const ModernCarSetup: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);

  // 基本情報
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

  // 保存処理
  const handleSave = async () => {
    if (!currentUser) {
      message.error('ログインが必要です');
      return;
    }

    setIsSaving(true);
    try {
      // ここで保存処理を実装
      message.success('セットアップデータを保存しました');
    } catch (error) {
      message.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 前回の値を読み込む
  const handleLoadPrevious = async () => {
    if (!currentUser) {
      message.error('ログインが必要です');
      return;
    }

    setIsLoadingPrevious(true);
    try {
      const previousSetups = await getUserSetups(currentUser.uid, 1);
      if (previousSetups.length === 0) {
        message.warning('前回のセットアップデータが見つかりません');
        return;
      }
      // ここでデータを読み込む処理
      message.success('前回のデータを読み込みました');
    } catch (error) {
      message.error('データ読み込みに失敗しました');
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  // タブ定義
  const tabs = [
    {
      id: 'basic',
      label: '基本設定',
      icon: <i className="fas fa-tachometer-alt" />,
      content: (
        <div className="p-6 space-y-6">
          <ModernTirePressureCard
            tirePressures={tirePressures}
            setTirePressures={setTirePressures}
          />
          <DamperCard
            damperSettings={damperSettings}
            setDamperSettings={setDamperSettings}
          />
        </div>
      )
    },
    {
      id: 'suspension',
      label: 'サスペンション',
      icon: <i className="fas fa-car" />,
      content: <SuspensionTab />
    },
    {
      id: 'driving',
      label: 'ドライビング',
      icon: <i className="fas fa-route" />,
      content: <DrivingTab notes={notes} setNotes={setNotes} />
    }
  ];

  return (
    <ModernLayout>
      <div className="h-screen flex flex-col">
        {/* セッション情報バー */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">サーキット</div>
                <div className="font-medium text-gray-900">{circuit}</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-xs text-gray-500 mb-1">車両</div>
                <div className="font-medium text-gray-900">{carModel}</div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-xs text-gray-500 mb-1">セッション</div>
                <div className="font-medium text-gray-900">
                  {sessionType === 'practice' ? '練習走行' : sessionType === 'qualifying' ? '予選' : 'レース'}
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <div className="text-xs text-gray-500 mb-1">日時</div>
                <div className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('ja-JP')} {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            
            {/* アクションボタン */}
            <div className="flex items-center space-x-3">
              <ModernButton
                variant="secondary"
                onClick={handleLoadPrevious}
                loading={isLoadingPrevious}
                icon={<ReloadOutlined />}
              >
                前回の値を読み込む
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={handleSave}
                loading={isSaving}
                icon={<SaveOutlined />}
              >
                保存
              </ModernButton>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 bg-gray-50">
          <div className="h-full max-w-7xl mx-auto">
            <ModernTabs tabs={tabs} defaultActiveKey="basic" />
          </div>
        </div>
      </div>
    </ModernLayout>
  );
};