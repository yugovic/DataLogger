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

interface ShareToggleProps {
  setup: CarSetup;
  /** 切替成功後に呼ばれる（親がローカル状態を更新するため） */
  onChanged?: (next: { visibility: 'private' | 'shared'; anonymized: boolean }) => void;
}

export const ShareToggle: React.FC<ShareToggleProps> = ({ setup, onChanged }) => {
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
        anonymize
          ? 'このデータを匿名で共有しました（ドライバー名は削除されました）'
          : 'このデータを共有しました',
      );
      setShareModalOpen(false);
      onChanged?.({ visibility: 'shared', anonymized: anonymize });
    } catch (error) {
      logger.error('共有に失敗しました:', error);
      message.error('共有に失敗しました。時間をおいて再度お試しください');
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
      message.success('共有を解除しました');
      setUnshareModalOpen(false);
      onChanged?.({ visibility: 'private', anonymized: false });
    } catch (error) {
      logger.error('共有解除に失敗しました:', error);
      message.error('共有解除に失敗しました。時間をおいて再度お試しください');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Tooltip title={shared ? '共有を解除' : 'このデータを共有'}>
        <button
          onClick={openDialog}
          aria-label={shared ? '共有を解除' : 'このデータを共有'}
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
        title="このデータを共有しますか？"
        open={shareModalOpen}
        onOk={doShare}
        onCancel={() => setShareModalOpen(false)}
        okText="共有する"
        cancelText="キャンセル"
        confirmLoading={submitting}
        okButtonProps={{ icon: <ShareAltOutlined /> }}
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md px-3 py-2">
            共有すると、他のユーザーの共有データを閲覧できるようになります。
          </p>
          <p>
            この走行記録（{setup.circuit} / {setup.carModel}）を共有プールに公開します。
            あなたが共有している間だけ、他のドライバーの共有データを見ることができます。
          </p>
          <Checkbox checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)}>
            匿名で共有する（ドライバー名を削除）
          </Checkbox>
          {anonymize && (
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2">
              <ExclamationCircleOutlined className="mt-0.5" />
              <span>
                匿名共有では、この記録のドライバー名はデータから削除されます。
                解除しても削除されたドライバー名は復元されません。
              </span>
            </p>
          )}
        </div>
      </Modal>

      {/* 共有解除ダイアログ */}
      <Modal
        title="共有を解除しますか？"
        open={unshareModalOpen}
        onOk={doUnshare}
        onCancel={() => setUnshareModalOpen(false)}
        okText="共有を解除"
        cancelText="キャンセル"
        confirmLoading={submitting}
        okButtonProps={{ danger: true }}
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>このデータを共有プールから外し、自分だけが見られる状態に戻します。</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            共有中のデータが他に無くなると、他のユーザーの共有データは閲覧できなくなります。
          </p>
        </div>
      </Modal>
    </>
  );
};
