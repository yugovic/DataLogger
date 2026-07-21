import React, { useState, useEffect, useMemo } from 'react';
import { Empty, Spin, message, Select, DatePicker, Button } from 'antd';
import { LoadingOutlined, FilterOutlined, CloseOutlined, SwapOutlined, DownloadOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSetups } from '../../services/setupService';
import { CarSetup } from '../../types/setup';
import { SetupCard } from './SetupCard';
import { Header } from '../common/Header';
import { PublicShareManager } from '../share/PublicShareManager';
import dayjs from 'dayjs';
import { useNavigate, useLocation } from 'react-router-dom';
import { setupsToCsv, csvFileName, downloadCsv } from '../../lib/csv';
import logger from '../../utils/logger';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';

export const SetupHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { locale } = useLocale();
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

  // 比較選択モード
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
          ? t('history.errors.permission') : t('history.errors.load');
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSetups();
  }, [currentUser, t]);

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

  // 「前回」マップ: 同一車種で日付が1つ前のセットアップ ID を引く。
  // setups は date desc で取得済みなので、車種ごとに次のインデックスが「前回」。
  const previousIdByCurrent = useMemo(() => {
    const map = new Map<string, string>();
    const lastSeenByModel = new Map<string, string>();
    // 新しい順に走査し、同一車種で直前（=次に新しい）に見たものを記録する
    setups.forEach((s) => {
      if (!s.id) return;
      const prevSameModel = lastSeenByModel.get(s.carModel);
      if (prevSameModel) {
        // prevSameModel（より新しい）から見た「前回」が現在の s
        map.set(prevSameModel, s.id);
      }
      lastSeenByModel.set(s.carModel, s.id);
    });
    return map;
  }, [setups]);

  // 「前回と比較」: 同一車種の直前データと比較画面へ
  const handleCompareWithPrevious = (id: string) => {
    const prevId = previousIdByCurrent.get(id);
    if (!prevId) {
      message.info(t('history.errors.noPrevious'));
      return;
    }
    // a = 前回（古い） / b = 今回（新しい）
    navigate(`/compare?a=${prevId}&b=${id}`);
  };

  // 選択トグル（最大2件まで）
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        // 古い方を外して新しい選択を追加（常に最新2件を保持）
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // 選択2件を比較
  const handleCompareSelected = () => {
    if (selectedIds.length !== 2) return;
    navigate(`/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`);
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  };

  // 共有状態の変更を一覧のローカル状態へ反映（再フェッチ不要）。
  // 匿名共有時は driver がデータ層で除去されるため表示からも消す。
  const handleVisibilityChanged = (
    id: string,
    next: { visibility: 'private' | 'shared'; anonymized: boolean },
  ) => {
    setSetups((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              visibility: next.visibility,
              anonymized: next.anonymized,
              driver: next.anonymized ? null : s.driver,
            }
          : s,
      ),
    );
  };

  // 削除成功時の一覧ローカル更新（再フェッチ不要）
  const handleDeleted = (id: string) => {
    setSetups((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  // CSVエクスポート（現在のフィルタ結果を出力）
  const handleExportCsv = () => {
    if (filteredSetups.length === 0) {
      message.warning(t('history.csv.empty'));
      return;
    }
    try {
      const csv = setupsToCsv(filteredSetups, t, locale);
      downloadCsv(csv, csvFileName());
      message.success(t('history.csv.success', { count: filteredSetups.length }));
    } catch (error) {
      logger.error('CSV export error:', error);
      message.error(t('history.csv.error'));
    }
  };

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

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('history.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('history.description')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<SwapOutlined />}
              type={compareMode ? 'primary' : 'default'}
              onClick={toggleCompareMode}
            >
              {t(compareMode ? 'history.compare.end' : 'history.compare.select')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              {t('history.csv.action')}
            </Button>
            <Button icon={<TeamOutlined />} onClick={() => navigate('/shared')}>
              {t('history.shared')}
            </Button>
          </div>
        </div>

        {/* 比較選択モードの操作バー */}
        {compareMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {t('history.compare.instruction', { count: selectedIds.length })}
            </span>
            <Button
              type="primary"
              disabled={selectedIds.length !== 2}
              onClick={handleCompareSelected}
            >
              {t('history.compare.action')}
            </Button>
          </div>
        )}

        <PublicShareManager />

        {/* フィルターセクション */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center mb-4">
            <FilterOutlined className="mr-2 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('history.filters.title')}</h3>
            {hasActiveFilters && (
              <Button
                size="small"
                type="link"
                icon={<CloseOutlined />}
                onClick={clearFilters}
                className="ml-auto"
              >
                {t('history.filters.clear')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('history.filters.month')}</label>
              <DatePicker
                picker="month"
                value={filterMonth}
                onChange={setFilterMonth}
                placeholder={t('history.filters.monthPlaceholder')}
                className="w-full"
                format={t('history.filters.monthFormat')}
                cellRender={(date, info) => {
                  if (info.type !== 'month') return info.originNode;
                  const monthKey = dayjs(date).format('YYYY-MM');
                  const count = monthlyDataCounts.get(monthKey) || 0;
                  return (
                    <div className="h-full flex flex-col items-center justify-center py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors">
                      <div>{dayjs(date).format('MMM')}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">({count})</div>
                    </div>
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('history.filters.session')}</label>
              <Select
                value={filterSessionType}
                onChange={setFilterSessionType}
                placeholder={t('common.select')}
                className="w-full"
                allowClear
              >
                <Select.Option value="practice">{t('common.sessionType.practice')} ({sessionTypeCounts.practice})</Select.Option>
                <Select.Option value="qualifying">{t('common.sessionType.qualifying')} ({sessionTypeCounts.qualifying})</Select.Option>
                <Select.Option value="race">{t('common.sessionType.race')} ({sessionTypeCounts.race})</Select.Option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('setup.circuit')}</label>
              <Select
                value={filterCircuit}
                onChange={setFilterCircuit}
                placeholder={t('common.select')}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('history.filters.vehicle')}</label>
              <Select
                value={filterCarModel}
                onChange={setFilterCarModel}
                placeholder={t('common.select')}
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
                    <>{t('history.empty.noData')}<br />{t('history.empty.create')}</>
                  ) : (
                    <>{t('history.empty.noMatch')}<br />{t('history.empty.changeFilters')}</>
                  )}
                </span>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {t('history.resultCount', { count: filteredSetups.length })}
              {hasActiveFilters && t('history.totalCount', { count: setups.length })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSetups.map((setup) => (
                <SetupCard
                  key={setup.id}
                  setup={setup}
                  selectable={compareMode}
                  selected={setup.id ? selectedIds.includes(setup.id) : false}
                  onToggleSelect={toggleSelect}
                  onCompareWithPrevious={handleCompareWithPrevious}
                  hasPrevious={setup.id ? previousIdByCurrent.has(setup.id) : false}
                  shareable={!compareMode}
                  onVisibilityChanged={handleVisibilityChanged}
                  onDeleted={handleDeleted}
                />
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
