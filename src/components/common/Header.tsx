import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal, Switch, Checkbox, message } from 'antd';
import { SettingOutlined, PlusOutlined, BellOutlined, LogoutOutlined, SunOutlined, MoonOutlined, DashboardOutlined, HistoryOutlined, CarOutlined, ToolOutlined, UserOutlined, NotificationOutlined, DatabaseOutlined, ExportOutlined, QuestionCircleOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { logout } from '../../services/authService';

interface HeaderProps {
  settingsModal: boolean;
  setSettingsModal: (open: boolean) => void;
  currentSettingView: string;
  setCurrentSettingView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  settingsModal, 
  setSettingsModal, 
  currentSettingView, 
  setCurrentSettingView 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      message.success('ログアウトしました');
      navigate('/auth');
    } catch (_error) {
      message.error('ログアウトに失敗しました');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm py-3 px-4 sm:px-6 flex items-center justify-between relative">
      <div className="flex items-center">
        <h1 className="text-xl sm:text-2xl font-bold">
          <span className="text-blue-500">VELOCITY</span> <span className="text-gray-800 dark:text-gray-200">LOGGER</span>
        </h1>
      </div>
      {/* モバイルハンバーガーボタン */}
      <button
        className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <CloseOutlined style={{ fontSize: '20px' }} /> : <MenuOutlined style={{ fontSize: '20px' }} />}
      </button>
      {/* デスクトップナビゲーション */}
      <div className="hidden md:flex items-center space-x-4">
        <button
          aria-label="ダッシュボード"
          onClick={() => navigate('/dashboard')}
          className={`flex items-center px-3 py-2 ${isActive('/dashboard') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md cursor-pointer whitespace-nowrap`}
        >
          <DashboardOutlined className="mr-2" />
          ダッシュボード
        </button>
        <button
          aria-label="セットアップ記録"
          onClick={() => navigate('/')}
          className={`flex items-center px-3 py-2 ${isActive('/') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md cursor-pointer whitespace-nowrap`}
        >
          <ToolOutlined className="mr-2" />
          セットアップ記録
        </button>
        <button
          aria-label="履歴一覧"
          onClick={() => navigate('/history')}
          className={`flex items-center px-3 py-2 ${isActive('/history') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md cursor-pointer whitespace-nowrap`}
        >
          <HistoryOutlined className="mr-2" />
          履歴一覧
        </button>
        <button
          aria-label="車両管理"
          onClick={() => navigate('/vehicles')}
          className={`flex items-center px-3 py-2 ${isActive('/vehicles') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md cursor-pointer whitespace-nowrap`}
        >
          <CarOutlined className="mr-2" />
          車両管理
        </button>
      </div>
      <div className="hidden md:flex items-center space-x-4">
        <button
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer"
          onClick={toggleDarkMode}
          title={darkMode ? 'ライトモードに切替' : 'ダークモードに切替'}
        >
          {darkMode ? <SunOutlined style={{ fontSize: '20px' }} /> : <MoonOutlined style={{ fontSize: '20px' }} />}
        </button>
        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer">
          <PlusOutlined style={{ fontSize: '20px' }} />
        </button>
        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer">
          <BellOutlined style={{ fontSize: '20px' }} />
        </button>
        <button
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer"
          onClick={() => setSettingsModal(true)}
        >
          <SettingOutlined style={{ fontSize: '20px' }} />
        </button>
        <button
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer"
          onClick={handleLogout}
          title="ログアウト"
        >
          <LogoutOutlined style={{ fontSize: '20px' }} />
        </button>

        {/* Settings Modal */}
        <Modal
          title="設定"
          open={settingsModal}
          onCancel={() => setSettingsModal(false)}
          width={600}
          footer={null}
          className="settings-modal"
        >
          <div className="flex h-[600px] overflow-hidden">
            <div className="w-48 border-r border-gray-200 pt-4 overflow-y-auto">
              <div className="flex flex-col space-y-1">
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'account' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('account')}
                >
                  <UserOutlined className="mr-3" />
                  アカウント設定
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'vehicle' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('vehicle')}
                >
                  <CarOutlined className="mr-3" />
                  車両設定
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'notification' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('notification')}
                >
                  <NotificationOutlined className="mr-3" />
                  通知設定
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'default' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('default')}
                >
                  <DatabaseOutlined className="mr-3" />
                  デフォルト値設定
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'export' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('export')}
                >
                  <ExportOutlined className="mr-3" />
                  データエクスポート
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'help' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('help')}
                >
                  <QuestionCircleOutlined className="mr-3" />
                  ヘルプ＆サポート
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {currentSettingView === 'account' && (
                <div className="text-gray-600">アカウント設定の内容がここに表示されます</div>
              )}
              {currentSettingView === 'vehicle' && (
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-6">車両設定</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">メーカー</label>
                        <input
                          type="text"
                          defaultValue="honda"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">モデル</label>
                        <input
                          type="text"
                          defaultValue="s2000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">年式</label>
                        <input
                          type="text"
                          defaultValue="2005"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">エンジン型式</label>
                        <input
                          type="text"
                          defaultValue="f20c"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">駆動方式</label>
                        <input
                          type="text"
                          defaultValue="fr"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">トランスミッション</label>
                        <input
                          type="text"
                          defaultValue="6mt"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">備考</label>
                      <textarea
                        rows={4}
                        placeholder="車両に関する特記事項があれば入力してください"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors whitespace-nowrap">
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {currentSettingView === 'notification' && (
                <div className="space-y-8">
                  <h3 className="text-lg font-medium mb-6">通知設定</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-bell text-blue-500"></i>
                        <div>
                          <div className="font-medium">アプリ内通知</div>
                          <div className="text-sm text-gray-500">アプリ使用中のポップアップ通知</div>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-envelope text-blue-500"></i>
                        <div>
                          <div className="font-medium">メール通知</div>
                          <div className="text-sm text-gray-500">登録メールアドレスへの通知</div>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-mobile-alt text-blue-500"></i>
                        <div>
                          <div className="font-medium">プッシュ通知</div>
                          <div className="text-sm text-gray-500">モバイルデバイスへのプッシュ通知</div>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <div className="mt-8">
                    <h4 className="text-base font-medium mb-4">通知を受け取るイベント</h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox defaultChecked>
                          <span className="ml-2">ラップタイム更新</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox defaultChecked>
                          <span className="ml-2">セッション開始・終了</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox defaultChecked>
                          <span className="ml-2">メンテナンススケジュール</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox>
                          <span className="ml-2">システムアップデート</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox>
                          <span className="ml-2">他のドライバーのアクティビティ</span>
                        </Checkbox>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-8">
                    <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors whitespace-nowrap">
                      設定を保存
                    </button>
                  </div>
                </div>
              )}
              {currentSettingView === 'default' && (
                <div className="text-gray-600">デフォルト値設定の内容がここに表示されます</div>
              )}
              {currentSettingView === 'export' && (
                <div className="text-gray-600">データエクスポートの内容がここに表示されます</div>
              )}
              {currentSettingView === 'help' && (
                <div className="text-gray-600">ヘルプ＆サポートの内容がここに表示されます</div>
              )}
            </div>
          </div>
        </Modal>
      </div>
      {/* モバイルメニュー */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 z-50 md:hidden">
          <nav className="flex flex-col p-2">
            <button
              onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
              className={`flex items-center px-4 py-3 ${isActive('/dashboard') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md`}
            >
              <DashboardOutlined className="mr-3" />
              ダッシュボード
            </button>
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              className={`flex items-center px-4 py-3 ${isActive('/') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md`}
            >
              <ToolOutlined className="mr-3" />
              セットアップ記録
            </button>
            <button
              onClick={() => { navigate('/history'); setMobileMenuOpen(false); }}
              className={`flex items-center px-4 py-3 ${isActive('/history') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md`}
            >
              <HistoryOutlined className="mr-3" />
              履歴一覧
            </button>
            <button
              onClick={() => { navigate('/vehicles'); setMobileMenuOpen(false); }}
              className={`flex items-center px-4 py-3 ${isActive('/vehicles') ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} rounded-md`}
            >
              <CarOutlined className="mr-3" />
              車両管理
            </button>
          </nav>
          <div className="flex items-center justify-around border-t border-gray-200 dark:border-gray-700 p-3">
            <button
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              onClick={toggleDarkMode}
            >
              {darkMode ? <SunOutlined style={{ fontSize: '20px' }} /> : <MoonOutlined style={{ fontSize: '20px' }} />}
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <BellOutlined style={{ fontSize: '20px' }} />
            </button>
            <button
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              onClick={() => { setSettingsModal(true); setMobileMenuOpen(false); }}
            >
              <SettingOutlined style={{ fontSize: '20px' }} />
            </button>
            <button
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              onClick={handleLogout}
            >
              <LogoutOutlined style={{ fontSize: '20px' }} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
