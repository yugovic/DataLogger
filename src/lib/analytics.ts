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
  | 'setup_updated'
  | 'setup_deleted'
  | 'setup_shared'
  | 'telemetry_imported'
  | 'comparison_viewed'
  | 'login'
  | 'sign_up';

// イベントごとのパラメータ型（個人情報禁止）
export type AnalyticsEventParams = {
  setup_saved: { circuit?: string; car_model?: string };
  setup_updated: { circuit?: string; car_model?: string };
  setup_deleted: { circuit?: string; car_model?: string };
  setup_shared: { circuit?: string; car_model?: string };
  telemetry_imported: { format?: string; circuit?: string };
  comparison_viewed: { circuit?: string; car_model?: string };
  login: Record<string, never>;
  sign_up: Record<string, never>;
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
