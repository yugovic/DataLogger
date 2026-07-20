/**
 * Firebase Analytics ラッパー
 *
 * - ブラウザ未対応環境（SSR・Node テスト実行等）では no-op として動作する
 * - console 汚染なし（エラー時はすべて silent）
 * - パラメータに個人情報（メール・氏名）を含めない
 */

import { isSupported, getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import app from './firebase';

// イベント名のunion型（WP2で計測が必要なもの + 後続WPのために予約）
export type AnalyticsEventName =
  | 'setup_saved'
  | 'setup_started'
  | 'setup_updated'
  | 'setup_deleted'
  | 'setup_shared'
  | 'share_disabled'
  | 'telemetry_imported'
  | 'telemetry_attach_succeeded'
  | 'telemetry_attach_failed'
  | 'telemetry_trace_save_failed'
  | 'lap_detection_failed'
  | 'telemetry_trace_saved'
  | 'comparison_viewed'
  | 'debrief_viewed'
  | 'next_action_saved'
  | 'setup_save_failed'
  | 'public_share_created'
  | 'public_share_viewed'
  | 'public_share_cta_clicked'
  | 'login'
  | 'sign_up'
  | 'onboarding_completed'
  | 'session_highlight_shown'
  | 'session_highlight_image_saved'
  | 'session_highlight_shared';

// イベントごとのパラメータ型（個人情報禁止）
export type AnalyticsEventParams = {
  setup_saved: { circuit?: string; car_model?: string };
  setup_started: { source: 'new' | 'copy' };
  setup_updated: { circuit?: string; car_model?: string };
  setup_deleted: { circuit?: string; car_model?: string };
  setup_shared: { circuit?: string; car_model?: string };
  share_disabled: { circuit?: string; car_model?: string };
  telemetry_imported: { format?: string; circuit?: string };
  telemetry_attach_succeeded: { format?: string; circuit?: string };
  telemetry_attach_failed: { reason?: string };
  telemetry_trace_save_failed: { format?: string; circuit?: string };
  lap_detection_failed: { format?: string; reason?: string };
  telemetry_trace_saved: { format?: string; circuit?: string; car_model?: string };
  comparison_viewed: { circuit?: string; car_model?: string };
  debrief_viewed: { circuit?: string; car_model?: string };
  next_action_saved: { circuit?: string; car_model?: string };
  setup_save_failed: { stage: 'setup' | 'telemetry'; reason?: string };
  public_share_created: { setupId?: string; hasLoggerEvidence: boolean };
  public_share_viewed: { shareId: string };
  public_share_cta_clicked: { shareId?: string };
  login: Record<string, never>;
  sign_up: Record<string, never>;
  onboarding_completed: { skipped: boolean };
  session_highlight_shown: { circuit?: string; badge_count?: number };
  session_highlight_image_saved: { circuit?: string };
  session_highlight_shared: { circuit?: string; method?: string };
};

// 遅延初期化 — isSupported() は非同期なので Promise でラップ
// getAnalytics は同じ app インスタンスに対して冪等（既存インスタンスを返す）
let analyticsPromise: Promise<Analytics | null> | null = null;

function getAnalyticsInstance(): Promise<Analytics | null> {
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = isSupported()
    .then((supported) => {
      if (!supported) return null;
      return getAnalytics(app); // firebase.ts の app と同一インスタンス、冪等
    })
    .catch(() => null); // 未対応環境・初期化失敗は silent に

  return analyticsPromise;
}

/**
 * 型付きイベントを Firebase Analytics に送る。
 * ローカル・非対応環境では no-op（エラーも出さない）。
 *
 * @example
 *   trackEvent('setup_saved', { circuit: '筑波2000', car_model: 'Honda S2000' });
 */
export async function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  params?: AnalyticsEventParams[T],
): Promise<void> {
  try {
    const analytics = await getAnalyticsInstance();
    if (!analytics) return;
    // logEvent のオーバーロードは Firebase 標準イベント名を期待するが、
    // カスタムイベントは string として渡せばよい
    logEvent(analytics, eventName as string, params as Record<string, unknown>);
  } catch {
    // Analytics 未対応 / ネットワークエラー等は silent に
  }
}
