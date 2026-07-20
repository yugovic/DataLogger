import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Spin, message, Card, Button, Modal, Input, InputNumber, Select, Checkbox } from 'antd';
import { LoadingOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined, SearchOutlined, ExperimentOutlined, DownloadOutlined, BookOutlined, ImportOutlined, TagsOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { toPublicVehicleProfile } from '../../lib/vehicleProfilePublic';
import { addVehicle, getUserVehicles, deleteVehicle } from '../../services/vehicleService';
import { getUserSetups } from '../../services/setupService';
import { Vehicle } from '../../types/vehicle';
import { buildVehicleCandidates, findVehicleByCarModel } from '../../lib/vehicleRegistration';
import type { VehicleCandidate } from '../../lib/vehicleRegistration';
import { downloadSpecCardImage, shareSpecCardImageViaWebShare } from '../../utils/shareImage';
import { Header } from '../common/Header';
import { SpecCard } from './SpecCard';
import { VehicleModal } from './VehicleModal';
import { TireSetManagerModal } from './TireSetManagerModal';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import { formatNumber } from '../../i18n/formatters';

export const VehicleList: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tireSetVehicle, setTireSetVehicle] = useState<Vehicle | null>(null);
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<'newest'|'oldest'|'yearDesc'|'yearAsc'|'makeAsc'>('newest');
  const [expandedVehicleIds, setExpandedVehicleIds] = useState<Set<string>>(new Set());
  const [historyCandidates, setHistoryCandidates] = useState<VehicleCandidate[]>([]);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [selectedCandidateNames, setSelectedCandidateNames] = useState<Set<string>>(new Set());
  const [candidateYears, setCandidateYears] = useState<Record<string, number>>({});
  const [registeringCandidates, setRegisteringCandidates] = useState(false);

  const fetchVehicles = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const [allVehicles, setups] = await Promise.all([
        getUserVehicles(currentUser.uid, true),
        getUserSetups(currentUser.uid, 100),
      ]);
      setVehicles(allVehicles.filter((vehicle) => vehicle.isActive !== false));
      // 非アクティブ車両も登録済みとして比較し、削除後に同名車両を再生成しない。
      setHistoryCandidates(buildVehicleCandidates(setups, allVehicles));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      message.error(t('vehicle.list.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [currentUser, t]);

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const filtered = vehicles.filter(v => {
    if (!keyword.trim()) return true;
    const k = keyword.toLowerCase();
    return [v.make, v.model, v.licensePlate].some(x => String(x || '').toLowerCase().includes(k));
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'oldest':
        return a.createdAt.getTime() - b.createdAt.getTime();
      case 'yearDesc':
        return (b.year || 0) - (a.year || 0);
      case 'yearAsc':
        return (a.year || 0) - (b.year || 0);
      case 'makeAsc':
        return String(a.make).localeCompare(String(b.make));
      case 'newest':
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    setVehicleModalVisible(true);
  };

  const openCandidateModal = () => {
    setSelectedCandidateNames(new Set());
    setCandidateYears(Object.fromEntries(
      historyCandidates.map((candidate) => [candidate.name, new Date().getFullYear()]),
    ));
    setCandidateModalOpen(true);
  };

  const toggleCandidate = (name: string, checked: boolean) => {
    setSelectedCandidateNames((previous) => {
      const next = new Set(previous);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const registerSelectedCandidates = async () => {
    if (!currentUser || selectedCandidateNames.size === 0) {
      message.warning(t('vehicle.list.history.selectRequired'));
      return;
    }

    setRegisteringCandidates(true);
    try {
      let allVehicles = await getUserVehicles(currentUser.uid, true);
      let createdCount = 0;
      for (const candidate of historyCandidates) {
        if (!selectedCandidateNames.has(candidate.name)) continue;
        // モーダル表示後に別経路で登録されていても重複作成しない。
        if (findVehicleByCarModel(allVehicles, candidate.name)) continue;
        await addVehicle({
          userId: currentUser.uid,
          make: candidate.make,
          model: candidate.model,
          year: candidateYears[candidate.name] ?? new Date().getFullYear(),
          isActive: true,
        });
        createdCount += 1;
        allVehicles = await getUserVehicles(currentUser.uid, true);
      }
      message.success(createdCount > 0 ? t('vehicle.list.history.created', { count: createdCount }) : t('vehicle.list.history.alreadyRegistered'));
      setCandidateModalOpen(false);
      await fetchVehicles();
    } catch (error) {
      console.error('Error registering vehicle candidates:', error);
      message.error(t('vehicle.list.history.error'));
    } finally {
      setRegisteringCandidates(false);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleModalVisible(true);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Modal.confirm({
      title: t('vehicle.list.delete.title'),
      content: t('vehicle.list.delete.content', { vehicle: `${vehicle.make} ${vehicle.model}`, year: vehicle.year }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          if (vehicle.id) {
            await deleteVehicle(vehicle.id);
            message.success(t('vehicle.list.delete.success'));
            fetchVehicles();
          }
        } catch (error) {
          console.error('Error deleting vehicle:', error);
          message.error(t('vehicle.list.delete.error'));
        }
      },
    });
  };

  const toggleSpecCard = (vehicleId: string) => {
    setExpandedVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  const handleSaveSpecCard = async (vehicle: Vehicle) => {
    if (!vehicle.profile) return;

    const data = {
      carModel: `${vehicle.make} ${vehicle.model}`,
      profile: toPublicVehicleProfile(vehicle.profile),
      ownerLabel: currentUser?.displayName ?? null,
      photoUrl: vehicle.photoURL || null,
    };

    try {
      const shareResult = await shareSpecCardImageViaWebShare(data);
      if (shareResult === 'cancelled') {
        return;
      }
      if (shareResult === 'unsupported') {
        await downloadSpecCardImage(data);
      }
      message.success(t('vehicle.list.cardSaved'));
    } catch (error) {
      console.error('Error saving spec card image:', error);
      message.error(t('vehicle.list.errors.cardSave'));
    }
  };

  const handleModalClose = () => {
    setVehicleModalVisible(false);
    setSelectedVehicle(null);
    fetchVehicles();
  };

  // Card.actions は各項目が均等幅(1/n)になるため、横並びボタンだとラベルがはみ出して重なる。
  // アイコン＋小ラベルの縦積みで各列に収める。
  const renderCardAction = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      key={label}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex w-full flex-col items-center justify-center gap-1 px-1 transition-colors ${
        danger
          ? 'text-red-500 hover:text-red-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[11px] leading-none whitespace-nowrap">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('vehicle.list.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('vehicle.list.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('vehicle.list.search')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64"
            />
            <Select
              value={sortKey}
              onChange={(v) => setSortKey(v)}
              className="w-44"
              options={[
                { value: 'newest', label: t('vehicle.list.sort.newest') },
                { value: 'oldest', label: t('vehicle.list.sort.oldest') },
                { value: 'yearDesc', label: t('vehicle.list.sort.yearDesc') },
                { value: 'yearAsc', label: t('vehicle.list.sort.yearAsc') },
                { value: 'makeAsc', label: t('vehicle.list.sort.makeAsc') },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddVehicle}
              size="large"
            >
              {t('vehicle.list.add')}
            </Button>
          </div>
        </div>

        {historyCandidates.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                {t('vehicle.list.history.candidates', { count: historyCandidates.length })}
              </div>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                {t('vehicle.list.history.description')}
              </p>
            </div>
            <Button icon={<ImportOutlined />} onClick={openCandidateModal}>
              {t('vehicle.list.history.action')}
            </Button>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty
              image={<CarOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  {t('vehicle.list.empty.title')}<br />
                  {t('vehicle.list.empty.description')}
                </span>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVehicle}>
                {t('vehicle.list.empty.action')}
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((vehicle) => (
              <Card
                key={vehicle.id}
                hoverable
                className="shadow-sm hover:shadow-md transition-shadow"
                onClick={() => handleEditVehicle(vehicle)}
                cover={
                  vehicle.photoURL ? (
                    <img
                      alt={`${vehicle.make} ${vehicle.model}`}
                      src={vehicle.photoURL}
                      loading="lazy"
                      className="h-48 object-cover"
                    />
                  ) : (
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <CarOutlined style={{ fontSize: 48, color: '#999' }} />
                    </div>
                  )
                }
                actions={[
                  vehicle.setupConfig?.tire?.tireSetManagementEnabled
                    ? renderCardAction(<TagsOutlined />, t('vehicle.list.actions.tires'), () => setTireSetVehicle(vehicle))
                    : null,
                  (vehicle.profile?.modifications.length ?? 0) > 0 && vehicle.id
                    ? renderCardAction(<BookOutlined />, t('vehicle.list.actions.journal'), () => navigate(`/vehicles/${vehicle.id}/journal`))
                    : null,
                  vehicle.profile && vehicle.id
                    ? renderCardAction(<ExperimentOutlined />, t('vehicle.list.actions.card'), () => toggleSpecCard(vehicle.id as string))
                    : null,
                  vehicle.profile
                    ? renderCardAction(<DownloadOutlined />, t('common.save'), () => handleSaveSpecCard(vehicle))
                    : null,
                  renderCardAction(<EditOutlined />, t('common.edit'), () => handleEditVehicle(vehicle)),
                  renderCardAction(<DeleteOutlined />, t('common.delete'), () => handleDeleteVehicle(vehicle), true),
                ].filter(Boolean)}
              >
                <Card.Meta
                  title={`${vehicle.make} ${vehicle.model}`}
                  description={
                    <div className="space-y-1 text-sm dark:text-gray-300">
                      <div>{t('vehicle.list.modelYear', { year: vehicle.year })} {vehicle.grade && `/ ${vehicle.grade}`}</div>
                      {vehicle.licensePlate && <div>{t('vehicle.list.licensePlate', { value: vehicle.licensePlate })}</div>}
                      {vehicle.mileage && <div>{t('vehicle.list.mileage', { value: formatNumber(vehicle.mileage, locale) })}</div>}
                      <div className="text-gray-500 dark:text-gray-400 mt-2">
                        {vehicle.engineType && `${vehicle.engineType} / `}
                        {vehicle.transmission && `${vehicle.transmission} / `}
                        {vehicle.drivetrain}
                      </div>
                    </div>
                  }
                />
                {vehicle.profile && vehicle.id && expandedVehicleIds.has(vehicle.id) && (
                  <div className="mt-4">
                    <SpecCard
                      carModel={`${vehicle.make} ${vehicle.model}`}
                      profile={toPublicVehicleProfile(vehicle.profile)}
                      variant="full"
                      ownerLabel={currentUser?.displayName ?? null}
                      photoUrl={vehicle.photoURL || null}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* 車両追加/編集モーダル */}
        <VehicleModal
          visible={vehicleModalVisible}
          onClose={handleModalClose}
          vehicle={selectedVehicle}
        />

        <TireSetManagerModal
          open={tireSetVehicle !== null}
          vehicle={tireSetVehicle}
          onClose={() => setTireSetVehicle(null)}
        />

        <Modal
          title={t('vehicle.list.history.modalTitle')}
          open={candidateModalOpen}
          onCancel={() => setCandidateModalOpen(false)}
          onOk={registerSelectedCandidates}
          okText={t('vehicle.list.history.confirm')}
          cancelText={t('common.cancel')}
          confirmLoading={registeringCandidates}
          okButtonProps={{ disabled: selectedCandidateNames.size === 0 }}
        >
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t('vehicle.list.history.modalDescription')}
          </p>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {historyCandidates.map((candidate) => (
              <div key={candidate.name} className="flex items-center gap-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <Checkbox
                  checked={selectedCandidateNames.has(candidate.name)}
                  onChange={(event) => toggleCandidate(candidate.name, event.target.checked)}
                  aria-label={t('vehicle.list.history.registerAria', { vehicle: candidate.name })}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-800 dark:text-gray-200">{candidate.name}</div>
                  <div className="text-xs text-gray-500">{t('vehicle.list.history.makeModel', { make: candidate.make, model: candidate.model })}</div>
                </div>
                <InputNumber
                  aria-label={t('vehicle.list.history.yearAria', { vehicle: candidate.name })}
                  value={candidateYears[candidate.name]}
                  onChange={(value) => setCandidateYears((previous) => ({
                    ...previous,
                    [candidate.name]: value ?? new Date().getFullYear(),
                  }))}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  precision={0}
                  className="w-28"
                  addonAfter={t('vehicle.list.yearUnit')}
                />
              </div>
            ))}
          </div>
        </Modal>
      </main>

      <footer className="bg-white dark:bg-gray-800 py-6 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 VELOCITY LOGGER. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
