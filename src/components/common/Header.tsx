import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal, Switch, Checkbox, message } from 'antd';
import { SettingOutlined, PlusOutlined, BellOutlined, LogoutOutlined, SunOutlined, MoonOutlined, DashboardOutlined, HistoryOutlined, CarOutlined, ToolOutlined, UserOutlined, NotificationOutlined, DatabaseOutlined, ExportOutlined, QuestionCircleOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { logout } from '../../services/authService';
import { getUserVehicles, updateVehicle, addVehicle, generateDefaultSetupConfig } from '../../services/vehicleService';
import { Vehicle } from '../../types/vehicle';
import { useTranslation } from 'react-i18next';
import { LocaleSelect } from './LocaleSelect';

const EMPTY_VEHICLE_FORM = {
  make: '',
  model: '',
  year: '',
  engineType: '',
  drivetrain: '',
  transmission: '',
  notes: ''
};

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
  const { currentUser } = useAuth();
  const { t } = useTranslation(['common', 'header']);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [vehicleSaving, setVehicleSaving] = useState(false);

  const applyVehicle = useCallback((vehicle: Vehicle | null) => {
    setVehicleForm({
      make: vehicle?.make ?? '',
      model: vehicle?.model ?? '',
      year: vehicle?.year != null ? String(vehicle.year) : '',
      engineType: vehicle?.engineType ?? '',
      drivetrain: vehicle?.drivetrain ?? '',
      transmission: vehicle?.transmission ?? '',
      notes: vehicle?.notes ?? ''
    });
  }, []);

  useEffect(() => {
    if (!settingsModal || currentSettingView !== 'vehicle' || !currentUser) return;
    let cancelled = false;
    getUserVehicles(currentUser.uid)
      .then((list) => {
        if (cancelled) return;
        setVehicles(list);
        const first = list[0] ?? null;
        setSelectedVehicleId(first?.id ?? '');
        applyVehicle(first);
      })
      .catch(() => {
        if (!cancelled) message.error(t('header:vehicle.loadError'));
      });
    return () => { cancelled = true; };
  }, [settingsModal, currentSettingView, currentUser, applyVehicle, t]);

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    applyVehicle(vehicles.find((v) => v.id === vehicleId) ?? null);
  };

  const setVehicleField = (field: keyof typeof EMPTY_VEHICLE_FORM, value: string) => {
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehicleSave = async () => {
    if (!currentUser) return;
    if (!vehicleForm.make.trim() || !vehicleForm.model.trim()) {
      message.error(t('header:vehicle.makeModelRequired'));
      return;
    }
    const yearText = vehicleForm.year.trim();
    const year = yearText === '' ? undefined : Number(yearText);
    if (year !== undefined && !Number.isInteger(year)) {
      message.error(t('header:vehicle.yearInteger'));
      return;
    }
    if (!selectedVehicleId && year === undefined) {
      message.error(t('header:vehicle.yearRequired'));
      return;
    }
    setVehicleSaving(true);
    try {
      const fields = {
        make: vehicleForm.make.trim(),
        model: vehicleForm.model.trim(),
        year,
        engineType: vehicleForm.engineType.trim(),
        drivetrain: vehicleForm.drivetrain.trim(),
        transmission: vehicleForm.transmission.trim(),
        notes: vehicleForm.notes.trim()
      };
      if (selectedVehicleId) {
        await updateVehicle(selectedVehicleId, fields);
        message.success(t('header:vehicle.updated'));
      } else {
        const newId = await addVehicle({
          ...fields,
          year: year as number,
          userId: currentUser.uid,
          isActive: true,
          setupConfig: generateDefaultSetupConfig()
        });
        setSelectedVehicleId(newId);
        message.success(t('header:vehicle.created'));
      }
      const list = await getUserVehicles(currentUser.uid);
      setVehicles(list);
    } catch (_error) {
      message.error(t('header:vehicle.saveError'));
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      message.success(t('header:logoutSuccess'));
      navigate('/auth');
    } catch (_error) {
      message.error(t('header:logoutError'));
    }
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
        aria-label={mobileMenuOpen ? t('common:menuClose') : t('common:menuOpen')}
      >
        {mobileMenuOpen ? <CloseOutlined style={{ fontSize: '20px' }} /> : <MenuOutlined style={{ fontSize: '20px' }} />}
      </button>
      {/* デスクトップナビゲーション */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
        <button
          aria-label={t('common:nav.dashboard')}
          onClick={() => navigate('/dashboard')}
          className={`${navBaseClass} ${isActive('/dashboard') ? navActiveClass : navIdleClass}`}
        >
          <DashboardOutlined />
          {t('common:nav.dashboard')}
        </button>
        <button
          aria-label={t('common:nav.setup')}
          onClick={() => navigate('/')}
          className={`${navBaseClass} ${isActive('/') ? navActiveClass : navIdleClass}`}
        >
          <ToolOutlined />
          {t('common:nav.setup')}
        </button>
        <button
          aria-label={t('common:nav.history')}
          onClick={() => navigate('/history')}
          className={`${navBaseClass} ${isActive('/history') ? navActiveClass : navIdleClass}`}
        >
          <HistoryOutlined />
          {t('common:nav.history')}
        </button>
        <button
          aria-label={t('common:nav.vehicles')}
          onClick={() => navigate('/vehicles')}
          className={`${navBaseClass} ${isActive('/vehicles') ? navActiveClass : navIdleClass}`}
        >
          <CarOutlined />
          {t('common:nav.vehicles')}
        </button>
        <button
          aria-label={t('common:nav.telemetry')}
          onClick={() => navigate('/telemetry')}
          className={`${navBaseClass} ${isActiveSection('/telemetry') ? navActiveClass : navIdleClass}`}
        >
          <DatabaseOutlined />
          {t('common:nav.telemetry')}
        </button>
        <button
          aria-label={t('common:nav.shared')}
          onClick={() => navigate('/shared')}
          className={`${navBaseClass} ${isActive('/shared') ? navActiveClass : navIdleClass}`}
        >
          <ExportOutlined />
          {t('common:nav.shared')}
        </button>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <button
          className={iconButtonClass}
          onClick={toggleDarkMode}
          title={darkMode ? t('common:lightMode') : t('common:darkMode')}
        >
          {darkMode ? <SunOutlined style={{ fontSize: '20px' }} /> : <MoonOutlined style={{ fontSize: '20px' }} />}
        </button>
        <button className={iconButtonClass} title={t('common:newRecord')}>
          <PlusOutlined style={{ fontSize: '20px' }} />
        </button>
        <button className={iconButtonClass} title={t('common:notifications')}>
          <BellOutlined style={{ fontSize: '20px' }} />
        </button>
        <button
          className={iconButtonClass}
          onClick={() => setSettingsModal(true)}
          title={t('common:settings')}
        >
          <SettingOutlined style={{ fontSize: '20px' }} />
        </button>
        <button
          className={iconButtonClass}
          onClick={handleLogout}
          title={t('common:logout')}
        >
          <LogoutOutlined style={{ fontSize: '20px' }} />
        </button>

        {/* Settings Modal */}
        <Modal
          title={t('common:settings')}
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
                  {t('common:accountSettings')}
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'vehicle' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('vehicle')}
                >
                  <CarOutlined className="mr-3" />
                  {t('common:vehicleSettings')}
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'notification' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('notification')}
                >
                  <NotificationOutlined className="mr-3" />
                  {t('common:notificationSettings')}
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'default' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('default')}
                >
                  <DatabaseOutlined className="mr-3" />
                  {t('common:defaultSettings')}
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'export' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('export')}
                >
                  <ExportOutlined className="mr-3" />
                  {t('common:dataExport')}
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSettingView === 'help' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setCurrentSettingView('help')}
                >
                  <QuestionCircleOutlined className="mr-3" />
                  {t('common:helpSupport')}
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {currentSettingView === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {t('common:accountSettings')}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('common:accountSettingsDescription')}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
                    <LocaleSelect showDescription />
                  </div>
                </div>
              )}
              {currentSettingView === 'vehicle' && (
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-6">{t('header:vehicle.title')}</h3>
                  <div className="space-y-6">
                    {vehicles.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.select')}</label>
                        <select
                          value={selectedVehicleId}
                          onChange={(e) => handleVehicleSelect(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.make} {v.model}{v.year ? ` (${v.year})` : ''}
                            </option>
                          ))}
                          <option value="">{t('header:vehicle.registerNew')}</option>
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.make')}</label>
                        <input
                          type="text"
                          value={vehicleForm.make}
                          onChange={(e) => setVehicleField('make', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.model')}</label>
                        <input
                          type="text"
                          value={vehicleForm.model}
                          onChange={(e) => setVehicleField('model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.year')}</label>
                        <input
                          type="text"
                          value={vehicleForm.year}
                          onChange={(e) => setVehicleField('year', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.engineType')}</label>
                        <input
                          type="text"
                          value={vehicleForm.engineType}
                          onChange={(e) => setVehicleField('engineType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.drivetrain')}</label>
                        <input
                          type="text"
                          value={vehicleForm.drivetrain}
                          onChange={(e) => setVehicleField('drivetrain', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.transmission')}</label>
                        <input
                          type="text"
                          value={vehicleForm.transmission}
                          onChange={(e) => setVehicleField('transmission', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('header:vehicle.notes')}</label>
                      <textarea
                        rows={4}
                        value={vehicleForm.notes}
                        onChange={(e) => setVehicleField('notes', e.target.value)}
                        placeholder={t('header:vehicle.notesPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleVehicleSave}
                        disabled={vehicleSaving}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {vehicleSaving ? t('common:saving') : t('common:save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {currentSettingView === 'notification' && (
                <div className="space-y-8">
                  <h3 className="text-lg font-medium mb-6">{t('header:notification.title')}</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-bell text-blue-500"></i>
                        <div>
                          <div className="font-medium">{t('header:notification.inApp')}</div>
                          <div className="text-sm text-gray-500">{t('header:notification.inAppDescription')}</div>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-envelope text-blue-500"></i>
                        <div>
                          <div className="font-medium">{t('header:notification.email')}</div>
                          <div className="text-sm text-gray-500">{t('header:notification.emailDescription')}</div>
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-mobile-alt text-blue-500"></i>
                        <div>
                          <div className="font-medium">{t('header:notification.push')}</div>
                          <div className="text-sm text-gray-500">{t('header:notification.pushDescription')}</div>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <div className="mt-8">
                    <h4 className="text-base font-medium mb-4">{t('header:notification.events')}</h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox defaultChecked>
                          <span className="ml-2">{t('header:notification.lapTime')}</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox defaultChecked>
                          <span className="ml-2">{t('header:notification.session')}</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox defaultChecked>
                          <span className="ml-2">{t('header:notification.maintenance')}</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox>
                          <span className="ml-2">{t('header:notification.system')}</span>
                        </Checkbox>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox>
                          <span className="ml-2">{t('header:notification.drivers')}</span>
                        </Checkbox>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-8">
                    <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors whitespace-nowrap">
                      {t('header:notification.save')}
                    </button>
                  </div>
                </div>
              )}
              {currentSettingView === 'default' && (
                <div className="text-gray-600 dark:text-gray-300">{t('header:placeholders.default')}</div>
              )}
              {currentSettingView === 'export' && (
                <div className="text-gray-600 dark:text-gray-300">{t('header:placeholders.export')}</div>
              )}
              {currentSettingView === 'help' && (
                <div className="text-gray-600 dark:text-gray-300">{t('header:placeholders.help')}</div>
              )}
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
              {t('common:nav.dashboard')}
            </button>
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/') ? navActiveClass : navIdleClass}`}
            >
              <ToolOutlined className="mr-3" />
              {t('common:nav.setup')}
            </button>
            <button
              onClick={() => { navigate('/history'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/history') ? navActiveClass : navIdleClass}`}
            >
              <HistoryOutlined className="mr-3" />
              {t('common:nav.history')}
            </button>
            <button
              onClick={() => { navigate('/vehicles'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/vehicles') ? navActiveClass : navIdleClass}`}
            >
              <CarOutlined className="mr-3" />
              {t('common:nav.vehicles')}
            </button>
            <button
              onClick={() => { navigate('/telemetry'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActiveSection('/telemetry') ? navActiveClass : navIdleClass}`}
            >
              <DatabaseOutlined className="mr-3" />
              {t('common:nav.telemetry')}
            </button>
            <button
              onClick={() => { navigate('/shared'); setMobileMenuOpen(false); }}
              className={`${mobileNavClass} ${isActive('/shared') ? navActiveClass : navIdleClass}`}
            >
              <ExportOutlined className="mr-3" />
              {t('common:nav.shared')}
            </button>
          </nav>
          <div className="flex items-center justify-around border-t border-slate-200 p-3 dark:border-slate-800">
            <button
              className={iconButtonClass}
              onClick={toggleDarkMode}
              aria-label={darkMode ? t('common:lightMode') : t('common:darkMode')}
            >
              {darkMode ? <SunOutlined style={{ fontSize: '20px' }} /> : <MoonOutlined style={{ fontSize: '20px' }} />}
            </button>
            <button className={iconButtonClass} aria-label={t('common:notifications')}>
              <BellOutlined style={{ fontSize: '20px' }} />
            </button>
            <button
              className={iconButtonClass}
              onClick={() => { setSettingsModal(true); setMobileMenuOpen(false); }}
              aria-label={t('common:settings')}
            >
              <SettingOutlined style={{ fontSize: '20px' }} />
            </button>
            <button
              className={iconButtonClass}
              onClick={handleLogout}
              aria-label={t('common:logout')}
            >
              <LogoutOutlined style={{ fontSize: '20px' }} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
