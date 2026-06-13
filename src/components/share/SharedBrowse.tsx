// 共有データ ブラウズ画面（/shared）— Give-to-Get の閲覧側。
//
// ゲート: 自分が未共有（sharingActive=false）なら一覧を出さず、共有を促す
// 案内＋履歴画面への CTA を表示する（相互性は firestore.rules でも強制されるが、
// UI でも明示して「共有→閲覧」の動機づけを行う）。
// 一覧: visibility=='shared' を対象に circuit×carModel で絞り込み、date 降順表示。
// 自分のドキュメントはサービス側で除外済み。

import React, { useEffect, useMemo, useState } from 'react';
import { Spin, Empty, Select, Button, message } from 'antd';
import { LoadingOutlined, TeamOutlined, ShareAltOutlined, FilterOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile } from '../../services/profileService';
import { getSharedSetups } from '../../services/setupService';
import { CarSetup } from '../../types/setup';
import { Header } from '../common/Header';
import { SharedSetupCard } from './SharedSetupCard';
import logger from '../../utils/logger';

export const SharedBrowse: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [settingsModal, setSettingsModal] = useState(false);
  const [currentSettingView, setCurrentSettingView] = useState('account');

  // ゲート用: 自分が共有しているか
  const [sharingActive, setSharingActive] = useState<boolean | null>(null);
  const [gateLoading, setGateLoading] = useState(true);

  // 一覧
  const [setups, setSetups] = useState<CarSetup[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // フィルタ（サーバー側クエリに反映）
  const [filterCircuit, setFilterCircuit] = useState<string | null>(null);
  const [filterCarModel, setFilterCarModel] = useState<string | null>(null);

  // セレクタの選択肢は「絞り込み前の全共有データ」から作る（在庫マトリクスの原型）
  const [allShared, setAllShared] = useState<CarSetup[]>([]);

  // ① ゲート判定 + 選択肢用の全共有データの初回ロード
  useEffect(() => {
    const init = async () => {
      if (!currentUser) return;
      setGateLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        setSharingActive(profile.sharingActive);
        if (profile.sharingActive) {
          // 選択肢生成のため一度だけ無フィルタで取得
          const all = await getSharedSetups(currentUser.uid, {}, 60);
          setAllShared(all);
        }
      } catch (error) {
        logger.error('共有ブラウズの初期化に失敗しました:', error);
        message.error('共有データの読み込みに失敗しました');
        setSharingActive(false);
      } finally {
        setGateLoading(false);
      }
    };
    init();
  }, [currentUser]);

  // ② フィルタ変更時にサーバー側クエリ（visibility+circuit/carModel+date のインデックス使用）
  useEffect(() => {
    const fetchList = async () => {
      if (!currentUser || !sharingActive) return;
      setListLoading(true);
      try {
        const list = await getSharedSetups(
          currentUser.uid,
          { circuit: filterCircuit, carModel: filterCarModel },
          60,
        );
        setSetups(list);
      } catch (error) {
        logger.error('共有データ一覧の取得に失敗しました:', error);
        message.error('共有データの取得に失敗しました');
      } finally {
        setListLoading(false);
      }
    };
    fetchList();
  }, [currentUser, sharingActive, filterCircuit, filterCarModel]);

  const circuitOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allShared.forEach((s) => counts.set(s.circuit, (counts.get(s.circuit) ?? 0) + 1));
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }, [allShared]);

  const carModelOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allShared.forEach((s) => counts.set(s.carModel, (counts.get(s.carModel) ?? 0) + 1));
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }, [allShared]);

  const hasActiveFilters = !!filterCircuit || !!filterCarModel;
  const clearFilters = () => {
    setFilterCircuit(null);
    setFilterCarModel(null);
  };

  const openDetail = (id: string) => navigate(`/shared/${id}`);

  // ── ローディング ──
  if (gateLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          settingsModal={settingsModal}
          setSettingsModal={setSettingsModal}
          currentSettingView={currentSettingView}
          setCurrentSettingView={setCurrentSettingView}
        />
        <div className="flex items-center justify-center h-96">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        </div>
      </div>
    );
  }

  // ── Give-to-Get ゲート（未共有ユーザー） ──
  if (!sharingActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          settingsModal={settingsModal}
          setSettingsModal={setSettingsModal}
          currentSettingView={currentSettingView}
          setCurrentSettingView={setCurrentSettingView}
        />
        <main className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-5">
              <TeamOutlined style={{ fontSize: 32 }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              あなたのセットアップを共有すると、他のドライバーの共有データを閲覧できます
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              VELOCITY LOGGER の共有はお互いさまの仕組みです。
              走行履歴から1件でもデータを共有すると、同じサーキット・車種で走る
              他のドライバーの共有セットアップを見られるようになります。
            </p>
            <Button
              type="primary"
              size="large"
              icon={<ShareAltOutlined />}
              onClick={() => navigate('/history')}
            >
              走行履歴から共有する
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── 共有データ一覧（共有済みユーザー） ──
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        settingsModal={settingsModal}
        setSettingsModal={setSettingsModal}
        currentSettingView={currentSettingView}
        setCurrentSettingView={setCurrentSettingView}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">みんなの共有データ</h2>
          <p className="text-gray-600 dark:text-gray-400">
            他のドライバーが共有したセットアップを、サーキット・車種で探せます。
          </p>
        </div>

        {/* フィルター */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center mb-4">
            <FilterOutlined className="mr-2 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">絞り込み</h3>
            {hasActiveFilters && (
              <Button size="small" type="link" icon={<CloseOutlined />} onClick={clearFilters} className="ml-auto">
                クリア
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">サーキット</label>
              <Select
                value={filterCircuit}
                onChange={setFilterCircuit}
                placeholder="すべてのサーキット"
                className="w-full"
                allowClear
                showSearch
              >
                {circuitOptions.map(({ value, count }) => (
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
                placeholder="すべての車種"
                className="w-full"
                allowClear
                showSearch
              >
                {carModelOptions.map(({ value, count }) => (
                  <Select.Option key={value} value={value}>
                    {value} ({count})
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
          </div>
        ) : setups.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <Empty
              description={
                <span className="text-gray-500 dark:text-gray-400">
                  {hasActiveFilters ? (
                    <>条件に一致する共有データがありません<br />絞り込み条件を変更してください</>
                  ) : (
                    <>まだ共有データがありません<br />最初の共有者になりましょう</>
                  )}
                </span>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">{setups.length}件の共有データ</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {setups.map((setup) => (
                <SharedSetupCard key={setup.id} setup={setup} onOpen={openDetail} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SharedBrowse;
