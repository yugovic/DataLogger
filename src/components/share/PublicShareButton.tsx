import React, { useState } from 'react';
import { Button, Input, Modal, Tooltip, message } from 'antd';
import { CopyOutlined, LinkOutlined } from '@ant-design/icons';
import { createPublicShare } from '../../services/publicShareService';
import type { CarSetup } from '../../types/setup';
import { useTranslation } from 'react-i18next';

interface PublicShareButtonProps {
  setup: CarSetup;
}

export const PublicShareButton: React.FC<PublicShareButtonProps> = ({ setup }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success(t('share.button.copySuccess'));
    } catch {
      message.error(t('share.button.copyError'));
    }
  };

  const issueShareLink = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      setLoading(true);
      const shareId = await createPublicShare(setup);
      const nextUrl = `${window.location.origin}/s/${shareId}`;
      setShareUrl(nextUrl);
      setModalOpen(true);
    } catch (error) {
      console.error('Public share issue error:', error);
      message.error(t('share.button.issueError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={t('share.button.tooltip')}>
        <button
          onClick={issueShareLink}
          disabled={loading}
          className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-900/30"
          aria-label={t('share.button.tooltip')}
        >
          <LinkOutlined style={{ fontSize: '16px' }} />
        </button>
      </Tooltip>

      <Modal
        open={modalOpen}
        title={t('share.button.modalTitle')}
        okText={t('share.button.modalClose')}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('share.button.modalDescription')}
          </p>
          <Input.Group compact>
            <Input readOnly value={shareUrl} className="w-[calc(100%-104px)]" />
            <Button icon={<CopyOutlined />} onClick={() => copyShareUrl(shareUrl)}>
              {t('share.button.copy')}
            </Button>
          </Input.Group>
        </div>
      </Modal>
    </>
  );
};
