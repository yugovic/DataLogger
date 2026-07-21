import React, { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Popconfirm, Spin, message } from 'antd';
import { CopyOutlined, DeleteOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { formatDate } from '../../i18n/formatters';
import { deletePublicShare, listMyPublicShares } from '../../services/publicShareService';
import type { PublicShare } from '../../types/publicShare';

const publicShareUrl = (shareId: string): string => `${window.location.origin}/s/${shareId}`;

export const PublicShareManager: React.FC = () => {
  const { t } = useTranslation('share');
  const { locale } = useLocale();
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
      message.error(t('share.manager.listError'));
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
      message.success(t('share.manager.copySuccess'));
    } catch {
      message.error(t('share.manager.copyError'));
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      setDeletingId(shareId);
      await deletePublicShare(shareId);
      setShares((prev) => prev.filter((share) => share.id !== shareId));
      message.success(t('share.manager.deleteSuccess'));
    } catch (error) {
      console.error('Public share delete error:', error);
      message.error(t('share.manager.deleteError'));
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
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('share.manager.title')}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('share.manager.description')}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchShares} loading={loading}>
          {t('share.manager.reload')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spin />
        </div>
      ) : shares.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-slate-500 dark:text-slate-400">{t('share.manager.empty')}</span>}
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
                    <span>{formatDate(share.summary.sessionDate, locale)}</span>
                    <span>{share.summary.bestLap ?? t('share.manager.bestLapUnrecorded')}</span>
                    {share.summary.hasLoggerEvidence && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t('share.manager.loggerMeasured')}</span>
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
                    {t('share.manager.copy')}
                  </Button>
                  <Popconfirm
                    title={t('share.manager.deleteTitle')}
                    description={t('share.manager.deleteDescription')}
                    okText={t('share.manager.deleteOk')}
                    okButtonProps={{ danger: true }}
                    cancelText={t('share.manager.deleteCancel')}
                    onConfirm={() => removeShare(shareId)}
                  >
                    <Button danger icon={<DeleteOutlined />} loading={deletingId === shareId}>
                      {t('share.manager.delete')}
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
