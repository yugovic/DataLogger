import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Spin, message, Card, Button, Modal, Input, Select } from 'antd';
import { LoadingOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined, SearchOutlined, ExperimentOutlined, DownloadOutlined, BookOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { toPublicVehicleProfile } from '../../lib/vehicleProfilePublic';
import { getUserVehicles, deleteVehicle } from '../../services/vehicleService';
import { Vehicle } from '../../types/vehicle';
import { downloadSpecCardImage, shareSpecCardImageViaWebShare } from '../../utils/shareImage';
import { Header } from '../common/Header';
import { SpecCard } from './SpecCard';
import { VehicleModal } from './VehicleModal';

export const VehicleList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<'newest'|'oldest'|'yearDesc'|'yearAsc'|'makeAsc'>('newest');
  const [expandedVehicleIds, setExpandedVehicleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVehicles();
  }, [currentUser]);

  const fetchVehicles = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userVehicles = await getUserVehicles(currentUser.uid);
      setVehicles(userVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      message.error('車両データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleModalVisible(true);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Modal.confirm({
      title: '車両を削除しますか？',
      content: `${vehicle.make} ${vehicle.model} (${vehicle.year}年式) を削除してもよろしいですか？`,
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          if (vehicle.id) {
            await deleteVehicle(vehicle.id);
            message.success('車両を削除しました');
            fetchVehicles();
          }
        } catch (error) {
          console.error('Error deleting vehicle:', error);
          message.error('車両の削除に失敗しました');
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
      message.success('カード画像を保存しました');
    } catch (error) {
      console.error('Error saving spec card image:', error);
      message.error('カード画像の保存に失敗しました');
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
    <div
      key={label}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={`flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
        danger
          ? 'text-red-500 hover:text-red-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[11px] leading-none whitespace-nowrap">{label}</span>
    </div>
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
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">車両管理</h2>
            <p className="text-gray-600 dark:text-gray-400">登録されている車両の一覧と設定</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="メーカー・モデル・ナンバー検索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64"
            />
            <Select
              value={sortKey}
              onChange={(v) => setSortKey(v)}
              className="w-44"
              options={[
                { value: 'newest', label: '新しい順' },
                { value: 'oldest', label: '古い順' },
                { value: 'yearDesc', label: '年式 高→低' },
                { value: 'yearAsc', label: '年式 低→高' },
                { value: 'makeAsc', label: 'メーカー順' },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddVehicle}
              size="large"
            >
              車両を追加
            </Button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty
              image={<CarOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  まだ車両が登録されていません<br />
                  車両を追加してセットアップ管理を始めましょう
                </span>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVehicle}>
                最初の車両を追加
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
                  (vehicle.profile?.modifications.length ?? 0) > 0 && vehicle.id
                    ? renderCardAction(<BookOutlined />, 'ジャーナル', () => navigate(`/vehicles/${vehicle.id}/journal`))
                    : null,
                  vehicle.profile && vehicle.id
                    ? renderCardAction(<ExperimentOutlined />, 'カード', () => toggleSpecCard(vehicle.id as string))
                    : null,
                  vehicle.profile
                    ? renderCardAction(<DownloadOutlined />, '保存', () => handleSaveSpecCard(vehicle))
                    : null,
                  renderCardAction(<EditOutlined />, '編集', () => handleEditVehicle(vehicle)),
                  renderCardAction(<DeleteOutlined />, '削除', () => handleDeleteVehicle(vehicle), true),
                ].filter(Boolean)}
              >
                <Card.Meta
                  title={`${vehicle.make} ${vehicle.model}`}
                  description={
                    <div className="space-y-1 text-sm dark:text-gray-300">
                      <div>{vehicle.year}年式 {vehicle.grade && `/ ${vehicle.grade}`}</div>
                      {vehicle.licensePlate && <div>ナンバー: {vehicle.licensePlate}</div>}
                      {vehicle.mileage && <div>走行距離: {vehicle.mileage.toLocaleString()} km</div>}
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
