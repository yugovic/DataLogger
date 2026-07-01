// SNSシェア画像を Canvas API で生成・ダウンロードするユーティリティ。
//
// ベストラップ更新や成長記録を 1200x630px のカード画像として描画し、
// PNG ダウンロードまたは Web Share API でシェアする。

import { buildSpecCardView } from '../lib/specCardView';
import type { PublicVehicleProfile } from '../lib/vehicleProfilePublic';
import type { HighlightBadge } from '../lib/sessionHighlights';
import { HIGHLIGHT_BADGE_LABELS } from '../lib/sessionHighlights';

export interface ShareCardData {
  circuit: string;
  carModel: string;
  bestLap: string;
  dateLabel: string;
  deltaSeconds?: number;
  sessionType?: string;
  shareUrl?: string;
}

export interface SpecCardImageData {
  carModel: string;
  profile: PublicVehicleProfile;
  ownerLabel?: string | null;
  shareUrl?: string;
}

export type SpecCardShareResult = 'shared' | 'unsupported' | 'cancelled';

export interface HighlightImageData {
  circuit: string;
  carModel: string;
  dateLabel: string;
  bestLap: string;
  lapCount: number | null;
  badges: HighlightBadge[];
  shareUrl?: string;
}

const truncateCanvasText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result.length > 0 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
};

const createPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create image blob'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });

const formatWatermarkShareUrl = (shareUrl: string): string => {
  try {
    const url = new URL(shareUrl);
    return `${url.host}${url.pathname}`;
  } catch {
    return shareUrl;
  }
};

export const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  options: { shareUrl?: string } = {},
): void => {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const right = W - 60;
  const baseY = H - 25;

  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('VELOCITY LOGGER', right, options.shareUrl ? baseY - 16 : baseY);

  if (options.shareUrl) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.78)';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      truncateCanvasText(ctx, formatWatermarkShareUrl(options.shareUrl), 460),
      right,
      baseY + 2,
    );
  }
  ctx.restore();
};

/** ダーク系のシェアカード画像を Canvas に描画し、Blob URL を返す */
export async function generateShareImage(data: ShareCardData): Promise<string> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#1e293b');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent bar
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#2563eb');
  accent.addColorStop(0.3, '#3b82f6');
  accent.addColorStop(1, '#0f172a');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 6);

  // Logo area
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('VELOCITY LOGGER', 60, 60);

  // Circuit name (truncate if too long)
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px sans-serif';
  const maxTextWidth = W - 120;
  let circuitText = data.circuit;
  if (ctx.measureText(circuitText).width > maxTextWidth) {
    while (ctx.measureText(circuitText + '…').width > maxTextWidth && circuitText.length > 0) {
      circuitText = circuitText.slice(0, -1);
    }
    circuitText += '…';
  }
  ctx.fillText(circuitText, 60, 120);

  // Car model (truncate if too long)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  let carText = data.carModel;
  if (ctx.measureText(carText).width > maxTextWidth) {
    while (ctx.measureText(carText + '…').width > maxTextWidth && carText.length > 0) {
      carText = carText.slice(0, -1);
    }
    carText += '…';
  }
  ctx.fillText(carText, 60, 155);

  // Best lap - large
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 72px monospace';
  ctx.fillText(data.bestLap, 60, 260);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText('BEST LAP', 60, 285);

  // Delta if available
  if (data.deltaSeconds !== undefined && data.deltaSeconds !== 0) {
    const improved = data.deltaSeconds > 0;
    const deltaText = `${improved ? '−' : '+'}${Math.abs(data.deltaSeconds).toFixed(3)}s`;
    ctx.fillStyle = improved ? '#10b981' : '#ef4444';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(deltaText, 60, 330);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText(improved ? '前回より改善' : '前回より遅延', 60, 355);
  }

  // Session type
  if (data.sessionType) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText(data.sessionType, 60, 390);
  }

  // Date
  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText(data.dateLabel, 60, 415);

  // Bottom bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, H - 60, W, 60);
  ctx.fillStyle = '#475569';
  ctx.font = '13px sans-serif';
  ctx.fillText('VELOCITY LOGGER — セットアップ記録・テレメトリ分析', 60, H - 25);
  drawWatermark(ctx, { shareUrl: data.shareUrl });

  // Convert to blob URL
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create image blob'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

/** マシンスペックカード画像を Canvas に描画し、PNG Blob を返す */
export async function generateSpecCardImage(data: SpecCardImageData): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const view = buildSpecCardView(data.profile);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.52, '#1e293b');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#2563eb');
  accent.addColorStop(0.45, '#38bdf8');
  accent.addColorStop(1, '#0f172a');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 8);

  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('VELOCITY LOGGER', 60, 58);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(truncateCanvasText(ctx, data.carModel, W - 120), 60, 122);

  if (data.ownerLabel) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.fillText(truncateCanvasText(ctx, `オーナー: ${data.ownerLabel}`, W - 120), 60, 154);
  }

  const badgeColor = {
    NORMAL: '#64748b',
    LIGHT: '#2563eb',
    MIDDLE: '#7c3aed',
    FULL: '#d97706',
  }[view.modLevel];
  ctx.fillStyle = badgeColor;
  ctx.fillRect(60, 184, 220, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(view.modLevelLabel, 80, 212);

  if (view.tireClassLabel) {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(300, 184, 250, 42);
    ctx.fillStyle = '#dbeafe';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(view.tireClassLabel, 320, 212);
  }

  let specY = 280;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('DECLARED SPEC', 60, specY - 28);
  view.specItems.forEach((item) => {
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(item.value, 60, specY);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${item.label} / ${item.notice}`, 60, specY + 24);
    specY += 78;
  });

  const listX = 610;
  let listY = 200;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('MODIFICATIONS', listX, 160);

  if (view.modificationGroups.length === 0) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('ノーマル車両', listX, listY);
  } else {
    const maxItems = 8;
    const rows = view.modificationGroups.flatMap((group) =>
      group.items.map((item) => ({
        category: group.label,
        text: item.maker ? `${item.partName} / ${item.maker}` : item.partName,
      })),
    );
    rows.slice(0, maxItems).forEach((row) => {
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(row.category, listX, listY);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '20px sans-serif';
      ctx.fillText(truncateCanvasText(ctx, row.text, W - listX - 70), listX, listY + 28);
      listY += 62;
    });
    if (rows.length > maxItems) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px sans-serif';
      ctx.fillText(`他${rows.length - maxItems}件`, listX, listY);
    }
  }

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, H - 60, W, 60);
  ctx.fillStyle = '#475569';
  ctx.font = '13px sans-serif';
  ctx.fillText('VELOCITY LOGGER — マシンスペックカード', 60, H - 25);
  drawWatermark(ctx, { shareUrl: data.shareUrl });

  return createPngBlob(canvas);
}

/**
 * ファーストラップ・アルバム用ハイライト画像を生成して PNG Blob を返す。
 * 1200×630 ダークトーン Canvas。drawWatermark を適用（公開URL入り対応）。
 */
export async function generateHighlightImage(data: HighlightImageData): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 背景グラデーション（既存パターンと統一）
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#1e293b');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // アクセントバー
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#2563eb');
  accent.addColorStop(0.3, '#3b82f6');
  accent.addColorStop(1, '#0f172a');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 6);

  // ロゴ
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('VELOCITY LOGGER', 60, 60);

  // サーキット名（大）
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(truncateCanvasText(ctx, data.circuit, W - 120), 60, 120);

  // 車種名
  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.fillText(truncateCanvasText(ctx, data.carModel, W - 120), 60, 156);

  // 日付
  ctx.fillStyle = '#64748b';
  ctx.font = '15px sans-serif';
  ctx.fillText(data.dateLabel, 60, 188);

  // ベストラップ（最大表示）
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 80px monospace';
  ctx.fillText(data.bestLap, 60, 300);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText('BEST LAP', 60, 326);

  // 周回数（あれば）
  if (data.lapCount !== null) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${data.lapCount} LAPS`, 60, 370);
  }

  // バッジ（最大4個・ピル型）
  if (data.badges.length > 0) {
    const badgeY = data.lapCount !== null ? 410 : 370;
    let badgeX = 60;
    const badgePadX = 18;
    const badgePadY = 10;
    const badgeRadius = 16;
    const badgeFont = 'bold 15px sans-serif';

    ctx.font = badgeFont;
    for (const badge of data.badges.slice(0, 4)) {
      const label = HIGHLIGHT_BADGE_LABELS[badge];
      const textWidth = ctx.measureText(label).width;
      const pillW = textWidth + badgePadX * 2;
      const pillH = 32;

      // ピル背景
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, pillW, pillH, badgeRadius);
      ctx.fill();

      // ラベルテキスト
      ctx.fillStyle = '#dbeafe';
      ctx.fillText(label, badgeX + badgePadX, badgeY + pillH / 2 + badgePadY / 2);

      badgeX += pillW + 12;
    }
  }

  // 下部バー
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, H - 60, W, 60);
  ctx.fillStyle = '#475569';
  ctx.font = '13px sans-serif';
  ctx.fillText('VELOCITY LOGGER — セッションハイライト', 60, H - 25);
  drawWatermark(ctx, { shareUrl: data.shareUrl });

  return createPngBlob(canvas);
}

/** シェア画像をダウンロード */
export async function downloadShareImage(data: ShareCardData): Promise<void> {
  const url = await generateShareImage(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `velocity-logger-${data.circuit}-${data.bestLap}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** マシンスペックカード画像をダウンロード */
export async function downloadSpecCardImage(data: SpecCardImageData): Promise<void> {
  const blob = await generateSpecCardImage(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `velocity-logger-spec-card-${data.carModel}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Web Share API でシェア（モバイル対応） */
export async function shareViaWebShare(data: ShareCardData): Promise<boolean> {
  if (!navigator.share) return false;

  try {
    const url = await generateShareImage(data);
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], 'velocity-logger-share.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `${data.circuit} — ${data.bestLap}`,
        text: `${data.carModel} @ ${data.circuit} — ベストラップ ${data.bestLap}`,
        files: [file],
      });
      URL.revokeObjectURL(url);
      return true;
    }
    URL.revokeObjectURL(url);
    return false;
  } catch {
    return false;
  }
}

/** Web Share API でマシンスペックカードを共有 */
export async function shareSpecCardImageViaWebShare(data: SpecCardImageData): Promise<SpecCardShareResult> {
  if (!navigator.share) return 'unsupported';

  const blob = await generateSpecCardImage(data);
  const file = new File([blob], 'velocity-logger-spec-card.png', { type: 'image/png' });

  if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
    return 'unsupported';
  }

  try {
    await navigator.share({
      title: `${data.carModel} マシンスペックカード`,
      text: `${data.carModel} のマシンスペックカード`,
      files: [file],
    });
    return 'shared';
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return 'cancelled';
    }
    throw error;
  }
}
