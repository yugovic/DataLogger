import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal, message } from 'antd';
import { SettingOutlined, LogoutOutlined, SunOutlined, MoonOutlined, DashboardOutlined, HistoryOutlined, CarOutlined, ToolOutlined, DatabaseOutlined, ExportOutlined, MenuOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnits } from '../../contexts/UnitsContext';
import { logout } from '../../services/authService';
import { useTranslation } from 'react-i18next';
import { LocaleSelect } from './LocaleSelect';

interface HeaderProps {
  settingsModal: boolean;
  setSettingsModal: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settingsModal,
  setSettingsModal,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, appearance, setAppearance } = useTheme();
  const { units, setPressureUnit, setTemperatureUnit } = useUnits();
  const { t } = useTranslation(['common', 'header']);

  const handleLogout = async () => {
    try {
      await logout();
      message.success(t('header.logoutSuccess'));
      navigate('/auth');
    } catch (_error) {
      message.error(t('header.logoutError'));
    }
  };

  const goToVehicles = () => {
    setSettingsModal(false);
    navigate('/vehicles');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isActiveSection = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navBaseClass =
    'group relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors whitespace-nowrap';
  const navActiveClass =
    'bg-slate-950 text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] dark:bg-white dark:text-slate-950';
  const navIdleClass =
    'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';
  const iconButtonClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white';
  const mobileNavClass =
    'flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition-colors';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] dark:bg-white dark:text-slate-950">
          <span className="text-sm font-black tracking-normal">VL</span>
        </div>
        <h1 className="min-w-0 text-lg font-black leading-none tracking-normal sm:text-xl">
          <span className="block text-slate-950 dark:text-white">VELOCITY</span>
          <span className="block text-[10px] font-bold tracking-[0.24em] text-blue-600 dark:text-blue-400">LOGGER</span>
        </h1>
      </div>
      {/* モバイルハンバーガーボタン */}
      <button
        className={`${iconButtonClass} md:hidden`}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? t('common.menuClose') : t('common.menuOpen')}
      >
        {mobileMenuOpen ? <CloseOutlined style={{ fontSize: '20px' }} /> : <MenuOutlined style={{ fontSize: '20px' }} />}
      </button>
      {/* デスクトップナビゲーション */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
        <button
          aria-label={t('common.nav.dashboard')}
          onClick={() => navigate('/dashboard')}
          className={`${navBaseClass} ${isActive('/dashboard') ? navActiveClass : navIdleClass}`}
        >
          <DashboardOutlined />
          {t('common.nav.dashboard')}
        </button>
        <button
          aria-label={t('common.nav.setup')}
          onClick={() => navigate('/')}
          className={`${navBaseClass} ${isActive('/') ? navActiveClass : navIdleClass}`}
        >
          <ToolOutlined />
          {t('common.nav.setup')}
        </button>
        <button
          aria-label={t('common.nav.history')}
          onClick={() => navigate('/history')}
          className={`${navBaseClass} ${isActive('/history') ? navActiveClass : navIdleClass}`}
        >
          <HistoryOutlined />
          {t('common.nav.history')}
        </button>
        <button
          aria-label={t('common.nav.vehicles')}
          onClick={() => navigate('/vehicles')}
          className={`${navBaseClass} ${isActive('/vehicles') ? navActiveClass : navIdleClass}`}
        >
          <CarOutlined />
          {t('common.nav.vehicles')}
        </button>
        <button
          aria-label={t('common.nav.telemetry')}
          onClick={() => navigate('/telemetry')}
          className={`${navBaseClass} ${isActiveSection('/telemetry') ? navActiveClass : navIdleClass}`}
        >
          <DatabaseOutlined />
          {t('common.nav.telemetry')}
        </button>
        <button
          aria-label={t('common.nav.shared')}
          onClick={() => navigate('/shared')}
          className={`${navBaseClass} ${isActive('/shared') ? navActiveClass : navIdleClass}`}
        >
          <ExportOutlined />
          {t('common.nav.shared')}
        </button>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <button
          className={iconButtonClass}
          onClick={toggleDarkMode}
          title={darkMode ? t('common.lightMode') : t('common.darkMode')}
        >
          {darkMode ? <SunOutlined style={{ fontSize: '20px' }} /> : <MoonOutlined style={{ fontSize: '20px' }} />}
        </button>
        <button
          className={iconButtonClass}
          onClick={() => setSettingsModal(true)}
          title={t('common.settings')}
        >
          <SettingOutlined style={{ fontSize: '20px' }} />
        </button>
        <button
          className={iconButtonClass}
          onClick={handleLogout}
          title={t('common.logout')}
        >
          <LogoutOutlined style={{ fontSize: '20px' }} />
        </button>

        {/* Settings Modal */}
        <Modal
          title={t('common.settings')}
          open={settingsModal}
          onCancel={() => setSettingsModal(false)}
          width={480}
          footer={null}
          className="settings-modal"
        >
          <div className="space-y-6 pt-2">
            <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
              <LocaleSelect showDescription />
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t('common.themeSetting')}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('common.themeSettingDescription')}
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={iconButtonClass}
                title={darkMode ? t('common.lightMode') : t('common.darkMode')}
              >
                {darkMode ? <SunOutlined style={{ fontSize: '18px' }} /> : <MoonOutlined style={{ fontSize: '18px' }} />}
              </button>
            </div>

            <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t('common.appearanceSetting')}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('common.appearanceSettingDescription')}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['basic', 'refined'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAppearance(mode)}
                    aria-pressed={appearance === mode}
                    className={`rounded-md border-2 px-3 text-sm font-bold ${
                      appearance === mode
                        ? 'border-blue-800 bg-blue-800 text-white'
                        : 'border-slate-400 text-slate-900 dark:border-slate-500 dark:text-slate-100'
                    }`}
                    style={{ minHeight: 60 }}
                  >
                    {t(`common.appearance.${mode}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t('common.unitSettings')}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('common.unitSettingsDescription')}
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{t('common.unitPressure')}</span>
                  <div className="inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
                    {(['kPa', 'psi'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setPressureUnit(u)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          units.pressure === u
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{t('common.unitTemperature')}</span>
                  <div className="inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
                    {(['C', 'F'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setTemperatureUnit(u)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          units.temperature === u
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {u === 'C' ? '℃' : '°F'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {t('common.vehicleSettings')}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('common.vehicleSettingsNotice')}
              </p>
              <button
                onClick={goToVehicles}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t('common.vehicleSettingsGo')}
                <RightOutlined style={{ fontSize: '12px' }} />
              </button>
            </div>
          </div>
        </Modal>
      </div>
      {/* モバイルメニュー */}
      </div>
      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <nav className="flex flex-col p-2">
            <button
              onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/dashboard') ? navActiveClass : navIdleClass}`}
            >
              <DashboardOutlined className="mr-3" />
              {t('common.nav.dashboard')}
            </button>
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/') ? navActiveClass : navIdleClass}`}
            >
              <ToolOutlined className="mr-3" />
              {t('common.nav.setup')}
            </button>
            <button
              onClick={() => { navigate('/history'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/history') ? navActiveClass : navIdleClass}`}
            >
              <HistoryOutlined className="mr-3" />
              {t('common.nav.history')}
            </button>
            <button
              onClick={() => { navigate('/vehicles'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/vehicles') ? navActiveClass : navIdleClass}`}
            >
              <CarOutlined className="mr-3" />
              {t('common.nav.vehicles')}
            </button>
            <button
              onClick={() => { navigate('/telemetry'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActiveSection('/telemetry') ? navActiveClass : navIdleClass}`}
            >
              <DatabaseOutlined className="mr-3" />
              {t('common.nav.telemetry')}
            </button>
            <button
              onClick={() => { navigate('/shared'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/shared') ? navActiveClass : navIdleClass}`}
            >
              <ExportOutlined className="mr-3" />
              {t('common.nav.shared')}
            </button>
          </nav>
          <div className="flex items-center justify-around border-t border-slate-200 p-3 dark:border-slate-800">
            <button
              className={iconButtonClass}
              onClick={toggleDarkMode}
              aria-label={darkMode ? t('common.lightMode') : t('common.darkMode')}
            >
              {darkMode ? <SunOutlined style={{ fontSize: '20px' }} /> : <MoonOutlined style={{ fontSize: '20px' }} />}
            </button>
            <button
              className={iconButtonClass}
              onClick={() => { setSettingsModal(true); setMobileMenuOpen(false); }}
              aria-label={t('common.settings')}
            >
              <SettingOutlined style={{ fontSize: '20px' }} />
            </button>
            <button
              className={iconButtonClass}
              onClick={handleLogout}
              aria-label={t('common.logout')}
            >
              <LogoutOutlined style={{ fontSize: '20px' }} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
