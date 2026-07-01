// ファーストラップ・アルバム — 保存後ハイライトモーダル。
//
// 新規保存成功後かつ computeSessionHighlight が非 null を返した場合のみ表示する。
// 更新・編集保存では表示しない（CarSetup.tsx の呼び出し側で制御）。
// null 保存原則: bestLap がない走行ではこのモーダル自体を表示しない。

import React, { useEffect, useState } from 'react';
import { Modal, Button, message } from 'antd';
import { DownloadOutlined, ShareAltOutlined, LinkOutlined } from '@ant-design/icons';
import type { SessionHighlight } from '../../lib/sessionHighlights';
import { HIGHLIGHT_BADGE_LABELS } from '../../lib/sessionHighlights';
import { generateHighlightImage } from '../../utils/shareImage';
import type { HighlightImageData } from '../../utils/shareImage';
import { createPublicShare } from '../../services/publicShareService';
import { trackEvent } from '../../lib/analytics';
import type { CarSetup } from '../../types/setup';

interface SessionHighlightModalProps {
  /** 表示制御 */
  open: boolean;
  onClose: () => void;
  /** computeSessionHighlight の結果（null の場合は親で表示しない） */
  highlight: SessionHighlight;
  /** 公開リンク発行に使用する保存済みセットアップ */
  savedSetup: CarSetup;
}

/** 日付を「YYYY/MM/DD」形式にフォーマット */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

export const SessionHighlightModal: React.FC<SessionHighlightModalProps> = ({
  open,
  onClose,
  highlight,
  savedSetup,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // モーダル表示の計測（開いたときに1回だけ発火）
  useEffect(() => {
    if (open) {
      void trackEvent('session_highlight_shown', {
        circuit: highlight.circuit,
        badge_count: highlight.badges.length,
      });
    }
  }, [open, highlight.circuit, highlight.badges.length]);

  const dateLabel = formatDate(highlight.sessionDate);

  /** HighlightImageData を構築するヘルパー（shareUrl はオプション） */
  const buildImageData = (shareUrl?: string): HighlightImageData => ({
    circuit: highlight.circuit,
    carModel: highlight.carModel,
    dateLabel,
    bestLap: highlight.bestLap ?? '',
    lapCount: highlight.lapCount,
    badges: highlight.badges,
    shareUrl,
  });

  // ── 画像を保存（ダウンロード） ───────────────────────────
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateHighlightImage(buildImageData());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velocity-logger-highlight-${highlight.circuit}-${highlight.bestLap}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      void trackEvent('session_highlight_image_saved', { circuit: highlight.circuit });
    } catch {
      message.error('画像の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Web Share API で共有 ────────────────────────────────
  const handleShare = async () => {
    if (!navigator.share) {
      message.info('お使いの環境では共有機能を利用できません');
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await generateHighlightImage(buildImageData());
      const file = new File([blob], 'velocity-logger-highlight.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${highlight.circuit} — ${highlight.bestLap}`,
            text: `${highlight.carModel} @ ${highlight.circuit} ベストラップ ${highlight.bestLap}`,
            files: [file],
          });
          void trackEvent('session_highlight_shared', {
            circuit: highlight.circuit,
            method: 'web_share',
          });
        } catch (error) {
          // ユーザーがキャンセルした場合は何もしない
          if (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name: string }).name === 'AbortError'
          ) {
            return;
          }
          throw error;
        }
      } else {
        message.info('お使いの環境ではファイル共有を利用できません');
      }
    } catch {
      message.error('共有に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 公開リンクを発行してURL入り画像を生成 ────────────────
  const handlePublishAndShare = async () => {
    setIsPublishing(true);
    try {
      // WP-5 の createPublicShare を再利用（既存リンクがあれば同一 ID を返す）
      const shareId = await createPublicShare(savedSetup);
      const shareUrl = `${window.location.origin}/share/${shareId}`;

      const blob = await generateHighlightImage(buildImageData(shareUrl));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velocity-logger-highlight-${highlight.circuit}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // URLをクリップボードにもコピー
      try {
        await navigator.clipboard.writeText(shareUrl);
        message.success('公開リンクをコピーしました（URLが画像に焼き込まれています）', 4);
      } catch {
        message.success(`公開リンクを発行しました: ${shareUrl}`, 5);
      }

      void trackEvent('session_highlight_shared', {
        circuit: highlight.circuit,
        method: 'public_link',
      });
    } catch {
      message.error('公開リンクの発行に失敗しました');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={null}
      footer={null}
      width={560}
      className="session-highlight-modal"
      centered
    >
      {/* ハイライトカードプレビュー */}
      <div className="bg-slate-900 dark:bg-slate-900 rounded-xl p-6 text-white">
        {/* ロゴ */}
        <p className="text-blue-400 dark:text-blue-400 text-xs font-bold tracking-widest mb-4">
          VELOCITY LOGGER
        </p>

        {/* サーキット名 */}
        <h2 className="text-2xl font-bold text-white dark:text-white leading-tight truncate mb-1">
          {highlight.circuit}
        </h2>

        {/* 車種名・日付 */}
        <p className="text-slate-400 dark:text-slate-400 text-sm mb-1">{highlight.carModel}</p>
        <p className="text-slate-500 dark:text-slate-500 text-xs mb-5">{dateLabel}</p>

        {/* ベストラップ（最大表示） */}
        <div className="mb-4">
          <p className="text-4xl font-bold text-emerald-400 dark:text-emerald-400 font-mono">
            {highlight.bestLap}
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">BEST LAP</p>
        </div>

        {/* 周回数 */}
        {highlight.lapCount !== null && (
          <p className="text-slate-300 dark:text-slate-300 text-sm font-bold mb-4">
            {highlight.lapCount} LAPS
          </p>
        )}

        {/* バッジ一覧（アニメなし・ピル型） */}
        {highlight.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {highlight.badges.map((badge) => (
              <span
                key={badge}
                className="bg-blue-700 dark:bg-blue-700 text-blue-100 dark:text-blue-100 text-xs font-bold px-3 py-1 rounded-full"
              >
                {HIGHLIGHT_BADGE_LABELS[badge]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="mt-5 flex flex-col gap-3">
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={isGenerating && !isPublishing}
          disabled={isPublishing}
          className="w-full"
          size="large"
        >
          画像を保存
        </Button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button
            icon={<ShareAltOutlined />}
            onClick={handleShare}
            loading={isGenerating && !isPublishing}
            disabled={isPublishing}
            className="w-full"
            size="large"
          >
            共有
          </Button>
        )}

        <Button
          type="primary"
          icon={<LinkOutlined />}
          onClick={handlePublishAndShare}
          loading={isPublishing}
          disabled={isGenerating && !isPublishing}
          className="w-full"
          size="large"
        >
          公開リンクを発行して共有
        </Button>

        <Button
          onClick={onClose}
          className="w-full"
          size="large"
        >
          閉じる
        </Button>
      </div>
    </Modal>
  );
};
