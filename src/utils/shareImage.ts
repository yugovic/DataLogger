// SNSシェア画像を Canvas API で生成・ダウンロードするユーティリティ。
//
// ベストラップ更新や成長記録を 1200x630px のカード画像として描画し、
// PNG ダウンロードまたは Web Share API でシェアする。

export interface ShareCardData {
  circuit: string;
  carModel: string;
  bestLap: string;
  dateLabel: string;
  deltaSeconds?: number;
  sessionType?: string;
}

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
