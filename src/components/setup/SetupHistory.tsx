import React, { useState, useEffect, useMemo } from 'react';
import { Empty, Spin, message, Select, DatePicker, Button } from 'antd';
import { LoadingOutlined, FilterOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSetups } from '../../services/setupService';
import { CarSetup } from '../../types/setup';
import { SetupCard } from './SetupCard';
import { Header } from '../common/Header';
import dayjs from 'dayjs';
import { useNavigate, useLocation } from 'react-router-dom';

export const SetupHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [setups, setSetups] = useState<CarSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');
  
  // フィルター状態
  const [filterMonth, setFilterMonth] = useState<dayjs.Dayjs | null>(null);
  const [filterSessionType, setFilterSessionType] = useState<string | null>(null);
  const [filterCircuit, setFilterCircuit] = useState<string | null>(null);
  const [filterCarModel, setFilterCarModel] = useState<string | null>(null);

  useEffect(() => {
    // 初期フィルターの復元（URL優先 → localStorage）
    const params = new URLSearchParams(location.search);
    const month = params.get('month') || localStorage.getItem('filterMonth');
    const session = params.get('session') || localStorage.getItem('filterSessionType');
    const circuit = params.get('circuit') || localStorage.getItem('filterCircuit');
    const model = params.get('carModel') || localStorage.getItem('filterCarModel');
    if (month) setFilterMonth(dayjs(month));
    if (session) setFilterSessionType(session);
    if (circuit) setFilterCircuit(circuit);
    if (model) setFilterCarModel(model);

    const fetchSetups = async () => {
      if (!currentUser) return;

      try {
        const userSetups = await getUserSetups(currentUser.uid, 50);
        setSetups(userSetups);
      } catch (error: any) {
        console.error('Error fetching setups:', error);
        const errorMessage = error?.code === 'permission-denied' 
          ? 'アクセス権限がありません。再度ログインしてください' 
          : `履歴データの取得に失敗しました: ${error?.message || 'エラーが発生しました'}`;
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSetups();
  }, [currentUser]);

  // フィルター変更時にURL/ローカルへ保存
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterMonth) params.set('month', filterMonth.format('YYYY-MM'));
    if (filterSessionType) params.set('session', filterSessionType);
    if (filterCircuit) params.set('circuit', filterCircuit);
    if (filterCarModel) params.set('carModel', filterCarModel);
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true });

    if (filterMonth) localStorage.setItem('filterMonth', filterMonth.format('YYYY-MM'));
    else localStorage.removeItem('filterMonth');
    if (filterSessionType) localStorage.setItem('filterSessionType', filterSessionType);
    else localStorage.removeItem('filterSessionType');
    if (filterCircuit) localStorage.setItem('filterCircuit', filterCircuit);
    else localStorage.removeItem('filterCircuit');
    if (filterCarModel) localStorage.setItem('filterCarModel', filterCarModel);
    else localStorage.removeItem('filterCarModel');
  }, [filterMonth, filterSessionType, filterCircuit, filterCarModel]);

  // ユニークな値と件数を取得
  const uniqueCircuits = useMemo(() => {
    const circuitCounts = new Map<string, number>();
    setups.forEach(setup => {
      circuitCounts.set(setup.circuit, (circuitCounts.get(setup.circuit) || 0) + 1);
    });
    return Array.from(circuitCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([circuit, count]) => ({ value: circuit, count }));
  }, [setups]);

  const uniqueCarModels = useMemo(() => {
    const carModelCounts = new Map<string, number>();
    setups.forEach(setup => {
      carModelCounts.set(setup.carModel, (carModelCounts.get(setup.carModel) || 0) + 1);
    });
    return Array.from(carModelCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([carModel, count]) => ({ value: carModel, count }));
  }, [setups]);

  // セッションタイプごとの件数
  const sessionTypeCounts = useMemo(() => {
    const counts = { practice: 0, qualifying: 0, race: 0 };
    setups.forEach(setup => {
      if (setup.sessionType in counts) {
        counts[setup.sessionType as keyof typeof counts]++;
      }
    });
    return counts;
  }, [setups]);

  // 年月ごとのデータ件数
  const monthlyDataCounts = useMemo(() => {
    const monthCounts = new Map<string, number>();
    setups.forEach(setup => {
      const monthKey = dayjs(setup.date).format('YYYY-MM');
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    });
    return monthCounts;
  }, [setups]);

  // フィルタリング処理
  const filteredSetups = useMemo(() => {
    return setups.filter(setup => {
      // 年月フィルター
      if (filterMonth) {
        const setupDate = dayjs(setup.date);
        if (setupDate.year() !== filterMonth.year() || setupDate.month() !== filterMonth.month()) {
          return false;
        }
      }
      
      // セッションタイプフィルター
      if (filterSessionType && setup.sessionType !== filterSessionType) {
        return false;
      }
      
      // サーキットフィルター
      if (filterCircuit && setup.circuit !== filterCircuit) {
        return false;
      }
      
      // 車種フィルター
      if (filterCarModel && setup.carModel !== filterCarModel) {
        return false;
      }
      
      return true;
    });
  }, [setups, filterMonth, filterSessionType, filterCircuit, filterCarModel]);

  // フィルターをクリア
  const clearFilters = () => {
    setFilterMonth(null);
    setFilterSessionType(null);
    setFilterCircuit(null);
    setFilterCarModel(null);
  };

  // フィルターが適用されているかチェック
  const hasActiveFilters = filterMonth || filterSessionType || filterCircuit || filterCarModel;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
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

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">走行履歴</h2>
          <p className="text-gray-600 dark:text-gray-400">過去の走行データとセットアップ情報を確認できます</p>
        </div>

        {/* フィルターセクション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center mb-4">
            <FilterOutlined className="mr-2 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">フィルター</h3>
            {hasActiveFilters && (
              <Button
                size="small"
                type="link"
                icon={<CloseOutlined />}
                onClick={clearFilters}
                className="ml-auto"
              >
                クリア
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年月</label>
              <DatePicker
                picker="month"
                value={filterMonth}
                onChange={setFilterMonth}
                placeholder="年月を選択"
                className="w-full"
                format="YYYY年MM月"
                cellRender={(date, info) => {
                  if (info.type !== 'month') return info.originNode;
                  const monthKey = date.format('YYYY-MM');
                  const count = monthlyDataCounts.get(monthKey) || 0;
                  return (
                    <div className="h-full flex flex-col items-center justify-center py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors">
                      <div>{date.format('MMM')}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">({count})</div>
                    </div>
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">セッションタイプ</label>
              <Select
                value={filterSessionType}
                onChange={setFilterSessionType}
                placeholder="選択してください"
                className="w-full"
                allowClear
              >
                <Select.Option value="practice">練習走行 ({sessionTypeCounts.practice})</Select.Option>
                <Select.Option value="qualifying">予選 ({sessionTypeCounts.qualifying})</Select.Option>
                <Select.Option value="race">レース ({sessionTypeCounts.race})</Select.Option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">サーキット</label>
              <Select
                value={filterCircuit}
                onChange={setFilterCircuit}
                placeholder="選択してください"
                className="w-full"
                allowClear
                showSearch
              >
                {uniqueCircuits.map(({ value, count }) => (
                  <Select.Option key={value} value={value}>
                    {value} ({count})
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">車種</label>
              <Select
                value={filterCarModel}
                onChange={setFilterCarModel}
                placeholder="選択してください"
                className="w-full"
                allowClear
                showSearch
              >
                {uniqueCarModels.map(({ value, count }) => (
                  <Select.Option key={value} value={value}>
                    {value} ({count})
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {filteredSetups.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  {setups.length === 0 ? (
                    <>まだ走行データがありません<br />新しいセットアップを記録してください</>
                  ) : (
                    <>条件に一致するデータが見つかりません<br />フィルター条件を変更してください</>
                  )}
                </span>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {filteredSetups.length}件のデータ
              {hasActiveFilters && ` （全{setups.length}件中）`}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSetups.map((setup) => (
                <SetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* フッター */}
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
