import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { trackEvent } from '../lib/analytics';
import { telemetryTraceSchema } from '../schemas/telemetryTraceSchema';
import type { TelemetryTrace, TelemetryTraceInput } from '../types/telemetryTrace';
import logger from '../utils/logger';

const COLLECTION_NAME = 'telemetryTraces';

function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date || obj instanceof Timestamp) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = sanitizeForFirestore(v);
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromFirestoreDoc(id: string, data: any): TelemetryTrace {
  return {
    ...data,
    id,
    sessionDate: data.sessionDate?.toDate ? data.sessionDate.toDate() : new Date(data.sessionDate),
    source: {
      ...data.source,
      importedAt: data.source?.importedAt?.toDate
        ? data.source.importedAt.toDate()
        : new Date(data.source?.importedAt),
    },
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  } as TelemetryTrace;
}

export async function saveTelemetryTrace(trace: TelemetryTraceInput): Promise<string> {
  const parsed = telemetryTraceSchema.safeParse(trace);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(' / ');
    throw new Error(`テレメトリ保存エラー: ${msg}`);
  }

  try {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const payload = sanitizeForFirestore({
      ...trace,
      sessionDate: Timestamp.fromDate(trace.sessionDate),
      source: {
        ...trace.source,
        importedAt: Timestamp.fromDate(trace.source.importedAt),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, payload);
    trackEvent('telemetry_trace_saved', {
      format: trace.source.format,
      circuit: trace.circuit,
      car_model: trace.carModel,
    });
    return docRef.id;
  } catch (error) {
    logger.error('テレメトリトレースの保存に失敗しました:', error);
    throw error;
  }
}

export async function getTelemetryTrace(traceId: string): Promise<TelemetryTrace | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, traceId));
    if (!snap.exists()) return null;
    return fromFirestoreDoc(snap.id, snap.data());
  } catch (error) {
    logger.error('テレメトリトレースの取得に失敗しました:', error);
    throw error;
  }
}

export async function getTelemetryTracesByIds(traceIds: readonly string[]): Promise<TelemetryTrace[]> {
  const uniqueIds = Array.from(new Set(traceIds.filter(Boolean)));
  const traces = await Promise.all(uniqueIds.map((id) => getTelemetryTrace(id)));
  return traces.filter((t): t is TelemetryTrace => t !== null);
}

export interface UserTelemetryTraceFilter {
  carModel?: string | null;
  trackId?: string | null;
  circuit?: string | null;
  excludeTraceId?: string | null;
}

export type ComparableTraceKind = 'self_best' | 'previous' | 'condition_match';

export interface ComparableTraceCandidate {
  trace: TelemetryTrace;
  kind: ComparableTraceKind;
  label: string;
  description: string;
  score: number;
  deltaSeconds: number;
}

export async function getUserTelemetryTraces(
  ownerId: string,
  filter: UserTelemetryTraceFilter = {},
): Promise<TelemetryTrace[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', ownerId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => fromFirestoreDoc(d.id, d.data()))
      .filter((t) => !filter.excludeTraceId || t.id !== filter.excludeTraceId)
      .filter((t) => !filter.carModel || t.carModel === filter.carModel)
      .filter((t) => {
        if (filter.trackId) return t.trackId === filter.trackId;
        if (filter.circuit) return t.circuit === filter.circuit;
        return true;
      })
      .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  } catch (error) {
    logger.error('ユーザーのテレメトリトレース一覧取得に失敗しました:', error);
    throw error;
  }
}

export async function findBestComparableTrace(current: TelemetryTrace): Promise<TelemetryTrace | null> {
  const candidates = await getUserTelemetryTraces(current.ownerId, {
    carModel: current.carModel,
    trackId: current.trackId,
    circuit: current.trackId ? null : current.circuit,
    excludeTraceId: current.id,
  });
  const valid = candidates.filter((t) => t.lap.valid && t.lap.type === 'NORMAL');
  if (valid.length === 0) return null;
  return valid.reduce((best, next) => (
    next.lap.timeSeconds < best.lap.timeSeconds ? next : best
  ));
}

function sameComparableBucket(a: TelemetryTrace, b: TelemetryTrace): boolean {
  if (a.carModel !== b.carModel) return false;
  if (a.trackId && b.trackId) return a.trackId === b.trackId;
  return a.circuit === b.circuit;
}

function conditionScore(current: TelemetryTrace, candidate: TelemetryTrace): number {
  let score = 0;
  const airA = current.conditions.weather.airTemp;
  const airB = candidate.conditions.weather.airTemp;
  if (airA != null && airB != null) score += Math.abs(airA - airB);
  else score += 8;

  const trackA = current.conditions.weather.trackTemp;
  const trackB = candidate.conditions.weather.trackTemp;
  if (trackA != null && trackB != null) score += Math.abs(trackA - trackB) * 0.7;
  else score += 8;

  const fuelA = current.conditions.fuel;
  const fuelB = candidate.conditions.fuel;
  if (fuelA != null && fuelB != null) score += Math.abs(fuelA - fuelB) * 0.15;
  else score += 3;

  if (current.conditions.tireInfo.brand !== candidate.conditions.tireInfo.brand) score += 8;
  if (current.conditions.tireInfo.compound !== candidate.conditions.tireInfo.compound) score += 6;
  return score;
}

function formatDeltaSeconds(seconds: number): string {
  return `${seconds >= 0 ? '+' : '-'}${Math.abs(seconds).toFixed(3)}s`;
}

function buildCandidate(
  current: TelemetryTrace,
  trace: TelemetryTrace,
  kind: ComparableTraceKind,
  score: number,
): ComparableTraceCandidate {
  const deltaSeconds = current.lap.timeSeconds - trace.lap.timeSeconds;
  const label = kind === 'self_best'
    ? '自己ベスト'
    : kind === 'previous'
      ? '前回セッション'
      : '条件が近いログ';
  const description = kind === 'condition_match'
    ? `${trace.sessionDate.toLocaleDateString('ja-JP')} / 条件差スコア ${score.toFixed(1)} / 今回比 ${formatDeltaSeconds(deltaSeconds)}`
    : `${trace.sessionDate.toLocaleDateString('ja-JP')} / 今回比 ${formatDeltaSeconds(deltaSeconds)}`;

  return { trace, kind, label, description, score, deltaSeconds };
}

/**
 * 現在のトレースに対する比較候補を、ユーザーが迷わない順で返す。
 *
 * 優先順:
 * 1. 同じ車種×コースの自己ベスト
 * 2. 同じ車種×コースの直近の過去セッション
 * 3. タイヤ・気温・路温・燃料が近いログ
 */
export async function getComparableTraceCandidates(current: TelemetryTrace): Promise<ComparableTraceCandidate[]> {
  const candidates = await getUserTelemetryTraces(current.ownerId, {
    carModel: current.carModel,
    trackId: current.trackId,
    circuit: current.trackId ? null : current.circuit,
    excludeTraceId: current.id,
  });
  const valid = candidates.filter((t) => (
    t.id &&
    t.lap.valid &&
    t.lap.type === 'NORMAL' &&
    sameComparableBucket(current, t)
  ));
  if (valid.length === 0) return [];

  const byId = new Map<string, ComparableTraceCandidate>();
  const add = (candidate: ComparableTraceCandidate) => {
    const id = candidate.trace.id;
    if (!id || byId.has(id)) return;
    byId.set(id, candidate);
  };

  const selfBest = valid.reduce((best, next) => (
    next.lap.timeSeconds < best.lap.timeSeconds ? next : best
  ));
  add(buildCandidate(current, selfBest, 'self_best', 0));

  const previous = valid
    .filter((t) => t.sessionDate.getTime() < current.sessionDate.getTime())
    .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())[0];
  if (previous) add(buildCandidate(current, previous, 'previous', 1));

  const conditionMatch = [...valid]
    .sort((a, b) => conditionScore(current, a) - conditionScore(current, b))[0];
  if (conditionMatch) {
    add(buildCandidate(current, conditionMatch, 'condition_match', conditionScore(current, conditionMatch)));
  }

  return Array.from(byId.values());
}

export async function selectDefaultComparableTrace(current: TelemetryTrace): Promise<ComparableTraceCandidate | null> {
  const candidates = await getComparableTraceCandidates(current);
  return candidates[0] ?? null;
}

export async function updateTelemetryTrace(
  traceId: string,
  updates: Partial<TelemetryTraceInput>,
): Promise<void> {
  try {
    const payload = sanitizeForFirestore({
      ...updates,
      ...(updates.sessionDate ? { sessionDate: Timestamp.fromDate(updates.sessionDate) } : {}),
      ...(updates.source?.importedAt
        ? { source: { ...updates.source, importedAt: Timestamp.fromDate(updates.source.importedAt) } }
        : {}),
      updatedAt: serverTimestamp(),
    });
    // updateDoc の型は FieldValue を細かく要求するため、既存 setupService と同様にキャストする
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(doc(db, COLLECTION_NAME, traceId), payload as any);
  } catch (error) {
    logger.error('テレメトリトレースの更新に失敗しました:', error);
    throw error;
  }
}

export async function deleteTelemetryTrace(traceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, traceId));
  } catch (error) {
    logger.error('テレメトリトレースの削除に失敗しました:', error);
    throw error;
  }
}
