// ファーストラップ・アルバム — セッションハイライトの純粋ロジック。
//
// React・Firebase 非依存。lapTimeToMs（setupFields.ts）を再利用する。
// null 保存原則: bestLap が null / パース不能の場合は SessionHighlight 自体を null で返す。

import type { CarSetup } from '../types/setup';
import { lapTimeToMs } from './setupFields';
import { isWetWeather } from './weather';

// ─── 型定義 ────────────────────────────────────────────────

export type HighlightBadge =
  | 'FIRST_VISIT'    // このサーキット初走行（履歴に同サーキットなし）
  | 'SELF_BEST'      // 同サーキット×同車両の自己ベスト更新
  | 'FIRST_LOGGER'   // 初のロガー証憑付き記録
  | 'RAIN_SESSION';  // 雨天走行（condition が 'ウェット' | 'フルウェット'）

export const HIGHLIGHT_BADGE_LABELS: Record<HighlightBadge, string> = {
  FIRST_VISIT: '初走行',
  SELF_BEST: '自己ベスト更新',
  FIRST_LOGGER: '初ロガー計測',
  RAIN_SESSION: '雨天走行',
};

export interface SessionHighlight {
  circuit: string;
  carModel: string;
  sessionDate: Date;
  bestLap: string | null;      // 表示用文字列（無ければ null）
  lapCount: number | null;     // lapTimeData.totalLaps（無ければ null）
  badges: HighlightBadge[];
}

// ─── 内部ヘルパー ────────────────────────────────────────────

/**
 * buildJournal.ts の toJournalSessions と同じ車両対応付け規則。
 * vehicleId がある場合は vehicleId 一致を優先し、ない場合は carModel 一致にフォールバックする。
 */
function isSameVehicle(a: CarSetup, b: CarSetup): boolean {
  // current (a) に vehicleId がある場合は vehicleId 同士で比較
  if (a.vehicleId && b.vehicleId) {
    return a.vehicleId === b.vehicleId;
  }
  // どちらかに vehicleId があるが相手にない → 別車両
  if (a.vehicleId || b.vehicleId) {
    return false;
  }
  // どちらも vehicleId なし → carModel で比較
  return a.carModel === b.carModel;
}

// ─── 公開関数 ────────────────────────────────────────────────

/**
 * セッションのハイライトを計算する。
 *
 * @param current   直前に保存したセットアップ（保存後に id が付与済みであること）
 * @param history   呼び出し側が渡す「過去の保存済みセットアップ（current を除く）」
 * @returns SessionHighlight | null
 *   bestLap が null またはパース不能な場合は null（モーダルを出さない根拠）
 */
export function computeSessionHighlight(
  current: CarSetup,
  history: CarSetup[],
): SessionHighlight | null {
  // ── ① bestLap バリデーション ──────────────────────────
  const bestLapStr = current.lapTimeData?.bestLap ?? null;
  const bestLapMs = lapTimeToMs(bestLapStr);
  // bestLap が null またはパース不能 → ハイライト全体を null
  if (bestLapMs === null) return null;

  // ── ② バッジ計算 ──────────────────────────────────────
  const badges: HighlightBadge[] = [];

  // FIRST_VISIT: 同サーキットの過去記録がひとつもない
  const sameCircuitHistory = history.filter((s) => s.circuit === current.circuit);
  if (sameCircuitHistory.length === 0) {
    badges.push('FIRST_VISIT');
  }

  // SELF_BEST: 同サーキット×同車両の過去 bestLap と比較
  // FIRST_VISIT と重複する「初走行で自明な自己ベスト」は付けない（仕様書より）
  if (sameCircuitHistory.length > 0) {
    const sameVehicleHistory = sameCircuitHistory.filter((s) => isSameVehicle(current, s));
    // 過去に有効なラップタイムが 1 件もない場合はバッジを付けない
    const pastBestMsList = sameVehicleHistory
      .map((s) => lapTimeToMs(s.lapTimeData?.bestLap ?? null))
      .filter((ms): ms is number => ms !== null);

    if (pastBestMsList.length > 0) {
      const pastBestMs = Math.min(...pastBestMsList);
      if (bestLapMs < pastBestMs) {
        badges.push('SELF_BEST');
      }
    }
  }

  // FIRST_LOGGER: current にロガー証憑があり、履歴に証憑付きが 1 件もない
  const currentHasEvidence = Boolean(current.lapTimeData?.evidence);
  if (currentHasEvidence) {
    const historyHasEvidence = history.some((s) => Boolean(s.lapTimeData?.evidence));
    if (!historyHasEvidence) {
      badges.push('FIRST_LOGGER');
    }
  }

  // RAIN_SESSION: weather.condition が 'ウェット' または 'フルウェット'
  // null / 未入力の場合はバッジを付けない（推定しない）
  if (isWetWeather(current.weather.condition)) {
    badges.push('RAIN_SESSION');
  }

  // ── ③ SessionHighlight を構築 ────────────────────────
  return {
    circuit: current.circuit,
    carModel: current.carModel,
    sessionDate: current.date,
    bestLap: bestLapStr,
    lapCount: current.lapTimeData?.totalLaps ?? null,
    badges,
  };
}
