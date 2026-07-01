import React, { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Popconfirm, Spin, message } from 'antd';
import { CopyOutlined, DeleteOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { deletePublicShare, listMyPublicShares } from '../../services/publicShareService';
import type { PublicShare } from '../../types/publicShare';

const formatDate = (date: Date): string =>
  date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const publicShareUrl = (shareId: string): string => `${window.location.origin}/s/${shareId}`;

export const PublicShareManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [shares, setShares] = useState<PublicShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setShares(await listMyPublicShares(currentUser.uid));
    } catch (error) {
      console.error('Public share list error:', error);
      message.error('公開リンク一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const copyShareUrl = async (shareId: string) => {
    try {
      await navigator.clipboard.writeText(publicShareUrl(shareId));
      message.success('公開リンクをコピーしました');
    } catch {
      message.error('公開リンクのコピーに失敗しました');
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      setDeletingId(shareId);
      await deletePublicShare(shareId);
      setShares((prev) => prev.filter((share) => share.id !== shareId));
      message.success('公開リンクを削除しました');
    } catch (error) {
      console.error('Public share delete error:', error);
      message.error('公開リンクの削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LinkOutlined className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">公開リンク管理</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            公開ランディングページに出るのは匿名サマリーのみです。不要になったリンクは削除できます。
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchShares} loading={loading}>
          再読み込み
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spin />
        </div>
      ) : shares.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-slate-500 dark:text-slate-400">発行済みの公開リンクはありません</span>}
        />
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {shares.map((share) => {
            const shareId = share.id as string;
            return (
              <div
                key={shareId}
                className="flex flex-col gap-3 bg-slate-50 px-3 py-3 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {share.summary.circuit}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {share.summary.carModel}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(share.summary.sessionDate)}</span>
                    <span>{share.summary.bestLap ?? 'ベストラップ未記録'}</span>
                    {share.summary.hasLoggerEvidence && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">ロガー計測</span>
                    )}
                  </div>
                  <a
                    href={publicShareUrl(shareId)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    {publicShareUrl(shareId)}
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button icon={<CopyOutlined />} onClick={() => copyShareUrl(shareId)}>
                    コピー
                  </Button>
                  <Popconfirm
                    title="公開リンクを削除しますか？"
                    description="削除後、このURLでは公開ページを表示できません。"
                    okText="削除"
                    okButtonProps={{ danger: true }}
                    cancelText="キャンセル"
                    onConfirm={() => removeShare(shareId)}
                  >
                    <Button danger icon={<DeleteOutlined />} loading={deletingId === shareId}>
                      削除
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
