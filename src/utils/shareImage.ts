// SNSシェア画像を Canvas API で生成・ダウンロードするユーティリティ。
//
// ベストラップ更新や成長記録を 1200x630px のカード画像として描画し、
// PNG ダウンロードまたは Web Share API でシェアする。

import { buildSpecCardView, splitCarModel } from '../lib/specCardView';
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
  /** 車両写真（data URL）。所有者が共有操作したときのみ渡す */
  photoUrl?: string | null;
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

// スペックカードの改造度テーマ（SpecCard.tsx の levelTheme と同期）
const SPEC_CARD_LEVEL_COLORS = {
  NORMAL: { field: '#E7E5E4', dot: '#78716C', heroInk: 'rgba(87, 83, 78, 0.35)' },
  LIGHT: { field: '#BAE6FD', dot: '#0EA5E9', heroInk: 'rgba(3, 105, 161, 0.30)' },
  MIDDLE: { field: '#DDD6FE', dot: '#8B5CF6', heroInk: 'rgba(109, 40, 217, 0.30)' },
  FULL: { field: '#FCD34D', dot: '#F59E0B', heroInk: 'rgba(180, 83, 9, 0.35)' },
} as const;

/** data URL から画像を読み込む（失敗時は reject） */
const loadCardImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load card photo'));
    img.src = src;
  });

/** ピルチップを描画し、次のチップの開始x座標を返す */
const drawPill = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  dotColor?: string,
): number => {
  const padX = 18;
  const height = 40;
  ctx.font = 'bold 18px sans-serif';
  const dotSpace = dotColor ? 18 : 0;
  const width = ctx.measureText(text).width + padX * 2 + dotSpace;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.strokeStyle = 'rgba(28, 25, 23, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.stroke();

  if (dotColor) {
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x + padX + 4, y + height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#292524';
  ctx.fillText(text, x + padX + dotSpace, y + 26);
  return x + width + 10;
};

/**
 * マシンスペックカード画像を Canvas に描画し、PNG Blob を返す。
 * 実物トレカと同じ縦型（900×1260）・写真ドミナント・低情報密度。
 * 改造明細は載せない（Web側カードの裏面で見る想定）。
 */
export async function generateSpecCardImage(data: SpecCardImageData): Promise<Blob> {
  const W = 900;
  const H = 1260;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const view = buildSpecCardView(data.profile);
  const theme = SPEC_CARD_LEVEL_COLORS[view.modLevel];
  const { maker, model } = splitCarModel(data.carModel);
  const margin = 56;
  const heroH = Math.round(H * 0.56);
  const footerH = 96;

  // ── ベース（ライト台紙） ──
  ctx.fillStyle = '#FAFAF9';
  ctx.fillRect(0, 0, W, H);

  // ── ヒーロー: 写真 or 改造度カラー地＋スピードライン＋ゴーストタイポ ──
  ctx.fillStyle = theme.field;
  ctx.fillRect(0, 0, W, heroH);

  let photo: HTMLImageElement | null = null;
  if (data.photoUrl) {
    try {
      photo = await loadCardImage(data.photoUrl);
    } catch {
      photo = null; // 読み込み失敗時はタイポグラフィにフォールバック
    }
  }

  if (photo) {
    // cover クロップでヒーロー領域に描画
    const scale = Math.max(W / photo.width, heroH / photo.height);
    const drawW = photo.width * scale;
    const drawH = photo.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, heroH);
    ctx.clip();
    ctx.drawImage(photo, (W - drawW) / 2, (heroH - drawH) / 2, drawW, drawH);
    ctx.restore();
  } else {
    // 斜めのスピードライン
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, heroH);
    ctx.clip();
    ctx.translate(W / 2, heroH / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    const span = Math.max(W, heroH) * 1.5;
    for (let x = -span; x < span; x += 44) {
      ctx.fillRect(x, -span, 10, span * 2);
    }
    ctx.restore();

    // ゴーストタイポ（モデル名を大きく）
    ctx.save();
    ctx.fillStyle = theme.heroInk;
    ctx.font = 'italic 900 104px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(truncateCanvasText(ctx, model.toUpperCase(), W - margin * 2), W / 2, heroH / 2 + 36);
    ctx.restore();
  }

  // 台紙への馴染ませフェード
  const fade = ctx.createLinearGradient(0, heroH - 70, 0, heroH);
  fade.addColorStop(0, 'rgba(250, 250, 249, 0)');
  fade.addColorStop(1, 'rgba(250, 250, 249, 0.85)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, heroH - 70, W, 70);

  // ── ピルチップ（3つまで: 改造度・タイヤ区分・出力申告値） ──
  let pillX = margin;
  const pillY = heroH + 36;
  pillX = drawPill(ctx, pillX, pillY, view.modLevelLabel, theme.dot);
  if (view.tireClassLabel) {
    pillX = drawPill(ctx, pillX, pillY, view.tireClassLabel);
  }
  const powerItem = view.specItems.find((item) => item.key === 'powerPs');
  if (powerItem) {
    drawPill(ctx, pillX, pillY, `${powerItem.value}（${powerItem.notice}）`);
  }

  // ── 車名（二段タイポ） ──
  let titleY = heroH + 150;
  if (maker) {
    ctx.fillStyle = '#A8A29E';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(maker.toUpperCase(), margin, titleY);
    titleY += 66;
  } else {
    titleY += 30;
  }
  ctx.fillStyle = '#1C1917';
  ctx.font = '900 68px sans-serif';
  ctx.fillText(truncateCanvasText(ctx, model, W - margin * 2), margin, titleY);

  if (data.ownerLabel) {
    ctx.fillStyle = '#A8A29E';
    ctx.font = '20px sans-serif';
    ctx.fillText(
      truncateCanvasText(ctx, `オーナー: ${data.ownerLabel}`, W - margin * 2),
      margin,
      titleY + 44,
    );
  }

  // ── フッターストリップ（ダーク）: 左=サマリー / 右=透かし（ブランド＋URL） ──
  ctx.fillStyle = '#1C1917';
  ctx.fillRect(0, H - footerH, W, footerH);
  ctx.fillStyle = '#D6D3D1';
  ctx.font = 'bold 20px sans-serif';
  const totalModItems = view.modificationGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  ctx.fillText(
    totalModItems > 0 ? `改造申告 ${totalModItems}件・${view.compactSummary}` : 'ノーマル車両',
    margin,
    H - footerH / 2 + 8,
  );
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
