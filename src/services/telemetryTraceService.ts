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
