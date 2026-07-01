import React, { useState } from 'react';
import { Button, Input, Modal, Tooltip, message } from 'antd';
import { CopyOutlined, LinkOutlined } from '@ant-design/icons';
import { createPublicShare } from '../../services/publicShareService';
import type { CarSetup } from '../../types/setup';

interface PublicShareButtonProps {
  setup: CarSetup;
}

export const PublicShareButton: React.FC<PublicShareButtonProps> = ({ setup }) => {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('公開リンクをコピーしました');
    } catch {
      message.error('公開リンクのコピーに失敗しました');
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
      message.error('公開リンクの発行に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="公開リンクを発行">
        <button
          onClick={issueShareLink}
          disabled={loading}
          className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-900/30"
          aria-label="公開リンクを発行"
        >
          <LinkOutlined style={{ fontSize: '16px' }} />
        </button>
      </Tooltip>

      <Modal
        open={modalOpen}
        title="公開リンク"
        okText="閉じる"
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            匿名サマリーの公開ページを発行しました。セットアップ数値詳細は公開されません。
          </p>
          <Input.Group compact>
            <Input readOnly value={shareUrl} className="w-[calc(100%-104px)]" />
            <Button icon={<CopyOutlined />} onClick={() => copyShareUrl(shareUrl)}>
              コピー
            </Button>
          </Input.Group>
        </div>
      </Modal>
    </>
  );
};
