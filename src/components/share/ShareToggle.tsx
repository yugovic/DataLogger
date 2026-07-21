// 共有トグル — 履歴カードから private⇄shared を切り替える操作 UI。
//
// Give-to-Get の本質（共有すると他人の共有データも見られるようになる相互性）を
// 確認ダイアログで必ず説明する。匿名共有を選ぶとドライバー名がデータ層から
// 削除される点も明示し、利用者の同意の上で setSetupVisibility を呼ぶ。

import React, { useState } from 'react';
import { Tooltip, Modal, Checkbox, message } from 'antd';
import { ShareAltOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { CarSetup } from '../../types/setup';
import { setSetupVisibility } from '../../services/setupService';
import { isShared } from './shareUtils';
import logger from '../../utils/logger';
import { useTranslation } from 'react-i18next';

interface ShareToggleProps {
  setup: CarSetup;
  /** 切替成功後に呼ばれる（親がローカル状態を更新するため） */
  onChanged?: (next: { visibility: 'private' | 'shared'; anonymized: boolean }) => void;
}

export const ShareToggle: React.FC<ShareToggleProps> = ({ setup, onChanged }) => {
  const { t } = useTranslation();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [unshareModalOpen, setUnshareModalOpen] = useState(false);
  const [anonymize, setAnonymize] = useState(setup.anonymized ?? false);
  const [submitting, setSubmitting] = useState(false);

  const shared = isShared(setup);

  const openDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shared) {
      setUnshareModalOpen(true);
    } else {
      setAnonymize(setup.anonymized ?? false);
      setShareModalOpen(true);
    }
  };

  const doShare = async () => {
    if (!setup.id) return;
    setSubmitting(true);
    try {
      await setSetupVisibility(setup.id, 'shared', anonymize, setup.userId, {
        circuit: setup.circuit,
        carModel: setup.carModel,
      });
      message.success(
        anonymize ? t('share.toggle.sharedAnon') : t('share.toggle.shared'),
      );
      setShareModalOpen(false);
      onChanged?.({ visibility: 'shared', anonymized: anonymize });
    } catch (error) {
      logger.error('共有に失敗しました:', error);
      message.error(t('share.toggle.shareError'));
    } finally {
      setSubmitting(false);
    }
  };

  const doUnshare = async () => {
    if (!setup.id) return;
    setSubmitting(true);
    try {
      await setSetupVisibility(setup.id, 'private', false, setup.userId, {
        circuit: setup.circuit,
        carModel: setup.carModel,
      });
      message.success(t('share.toggle.unshareSuccess'));
      setUnshareModalOpen(false);
      onChanged?.({ visibility: 'private', anonymized: false });
    } catch (error) {
      logger.error('共有解除に失敗しました:', error);
      message.error(t('share.toggle.unshareError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Tooltip title={shared ? t('share.toggle.unshare') : t('share.toggle.share')}>
        <button
          onClick={openDialog}
          aria-label={shared ? t('share.toggle.unshare') : t('share.toggle.share')}
          className={`p-2 rounded-md transition-colors ${
            shared
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <ShareAltOutlined style={{ fontSize: '16px' }} />
        </button>
      </Tooltip>

      {/* 共有開始ダイアログ */}
      <Modal
        title={t('share.toggle.shareModalTitle')}
        open={shareModalOpen}
        onOk={doShare}
        onCancel={() => setShareModalOpen(false)}
        okText={t('share.toggle.shareOk')}
        cancelText={t('share.toggle.cancel')}
        confirmLoading={submitting}
        okButtonProps={{ icon: <ShareAltOutlined /> }}
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md px-3 py-2">
            {t('share.toggle.reciprocity')}
          </p>
          <p>{t('share.toggle.shareBody', { circuit: setup.circuit, carModel: setup.carModel })}</p>
          <Checkbox checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)}>
            {t('share.toggle.anonymize')}
          </Checkbox>
          {anonymize && (
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2">
              <ExclamationCircleOutlined className="mt-0.5" />
              <span>{t('share.toggle.anonymizeWarning')}</span>
            </p>
          )}
        </div>
      </Modal>

      {/* 共有解除ダイアログ */}
      <Modal
        title={t('share.toggle.unshareModalTitle')}
        open={unshareModalOpen}
        onOk={doUnshare}
        onCancel={() => setUnshareModalOpen(false)}
        okText={t('share.toggle.unshareOk')}
        cancelText={t('share.toggle.cancel')}
        confirmLoading={submitting}
        okButtonProps={{ danger: true }}
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>{t('share.toggle.unshareBody')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('share.toggle.unshareNote')}
          </p>
        </div>
      </Modal>
    </>
  );
};
