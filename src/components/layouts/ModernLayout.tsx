// モダンなレイアウトコンポーネント
import React, { useState } from 'react';
import { BellOutlined, MenuOutlined, PlusOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { ModernButton } from '../ui/ModernButton';
import { ModernModal } from '../ui/ModernModal';
import { useAuth } from '../../contexts/AuthContext';
import { logout } from '../../services/authService';
import { message } from 'antd';

interface ModernLayoutProps {
  children: React.ReactNode;
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      message.success('ログアウトしました');
      window.location.href = '/auth';
    } catch (error) {
      message.error('ログアウトに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* モダンヘッダー */}
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ロゴ */}
            <div className="flex items-center">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <MenuOutlined className="text-xl" />
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-bold">
                <span className="text-blue-600">VELOCITY</span>
                <span className="text-gray-900 ml-1">LOGGER</span>
              </h1>
            </div>

            {/* デスクトップナビゲーション */}
            <nav className="hidden lg:flex items-center space-x-1">
              <NavItem active href="#" icon={<i className="fas fa-tachometer-alt" />}>
                ダッシュボード
              </NavItem>
              <NavItem href="#" icon={<i className="fas fa-cog" />}>
                セットアップ記録
              </NavItem>
              <NavItem href="#" icon={<i className="fas fa-history" />}>
                履歴一覧
              </NavItem>
            </nav>

            {/* アクションボタン */}
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <PlusOutlined className="text-xl text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <BellOutlined className="text-xl text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <SettingOutlined className="text-xl text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* モバイルメニュー */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-100 animate-slide-down">
            <nav className="px-4 py-2 space-y-1">
              <MobileNavItem active icon={<i className="fas fa-tachometer-alt" />}>
                ダッシュボード
              </MobileNavItem>
              <MobileNavItem icon={<i className="fas fa-cog" />}>
                セットアップ記録
              </MobileNavItem>
              <MobileNavItem icon={<i className="fas fa-history" />}>
                履歴一覧
              </MobileNavItem>
            </nav>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">
        {children}
      </main>

      {/* 設定モーダル */}
      <ModernModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="設定"
        size="md"
      >
        <div className="space-y-6">
          {/* プロフィール */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {currentUser?.email?.[0].toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{currentUser?.email || 'ゲストユーザー'}</p>
              <p className="text-sm text-gray-500">無料プラン</p>
            </div>
          </div>

          {/* 設定項目 */}
          <div className="space-y-2">
            <SettingItem icon={<i className="fas fa-user" />} title="アカウント設定" />
            <SettingItem icon={<i className="fas fa-bell" />} title="通知設定" />
            <SettingItem icon={<i className="fas fa-shield-alt" />} title="プライバシー設定" />
            <SettingItem icon={<i className="fas fa-database" />} title="データ管理" />
            <SettingItem icon={<i className="fas fa-question-circle" />} title="ヘルプ" />
          </div>

          {/* ログアウト */}
          <ModernButton
            variant="danger"
            fullWidth
            onClick={handleLogout}
            icon={<LogoutOutlined />}
          >
            ログアウト
          </ModernButton>
        </div>
      </ModernModal>
    </div>
  );
};

// ナビゲーションアイテムコンポーネント
const NavItem: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  active?: boolean;
}> = ({ children, icon, href = '#', active = false }) => (
  <a
    href={href}
    className={`
      flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm
      transition-all duration-200
      ${active 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }
    `}
  >
    {icon && <span className="text-lg">{icon}</span>}
    <span>{children}</span>
  </a>
);

// モバイルナビゲーションアイテム
const MobileNavItem: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
}> = ({ children, icon, active = false }) => (
  <a
    href="#"
    className={`
      flex items-center space-x-3 px-4 py-3 rounded-lg
      ${active 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-600 hover:bg-gray-50'
      }
    `}
  >
    {icon && <span className="text-lg">{icon}</span>}
    <span className="font-medium">{children}</span>
  </a>
);

// 設定項目
const SettingItem: React.FC<{
  icon: React.ReactNode;
  title: string;
}> = ({ icon, title }) => (
  <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
    <span className="text-gray-400">{icon}</span>
    <span className="font-medium text-gray-700">{title}</span>
    <i className="fas fa-chevron-right text-gray-400 text-sm ml-auto"></i>
  </button>
);