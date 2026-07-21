import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { trackEvent } from '../lib/analytics';
import { buildShareSummary, generatePublicShareId } from '../lib/publicShareSummary';
import type { CarSetup } from '../types/setup';
import type { PublicShare, PublicShareSummary } from '../types/publicShare';

const COLLECTION_NAME = 'publicShares';

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  return new Date(String(value));
};

const summaryToFirestore = (summary: PublicShareSummary) => ({
  ...summary,
  sessionDate: Timestamp.fromDate(summary.sessionDate),
});

const fromFirestoreDoc = (id: string, data: Record<string, unknown>): PublicShare => {
  const summary = data.summary as Record<string, unknown>;

  return {
    id,
    ownerId: String(data.ownerId),
    setupId: String(data.setupId),
    createdAt: toDate(data.createdAt),
    summary: {
      circuit: String(summary.circuit),
      carModel: String(summary.carModel),
      bestLap: typeof summary.bestLap === 'string' ? summary.bestLap : null,
      sessionDate: toDate(summary.sessionDate),
      hasLoggerEvidence: Boolean(summary.hasLoggerEvidence),
      vehicleProfileSnapshot: (summary.vehicleProfileSnapshot ?? null) as PublicShareSummary['vehicleProfileSnapshot'],
    },
  };
};

export const createPublicShare = async (setup: CarSetup): Promise<string> => {
  if (!setup.id) {
    // UI 側（PublicShareButton）で t('share.service.needSavedSetup') を表示する。
    // ここは開発者向けの技術メッセージのため英語で投げる。
    throw new Error('A saved setup is required to create a public link');
  }

  const existingQuery = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', setup.userId),
    where('setupId', '==', setup.id),
    limit(1),
  );
  const existingSnapshot = await getDocs(existingQuery);
  const existing = existingSnapshot.docs[0];
  if (existing) return existing.id;

  const shareId = generatePublicShareId();
  const summary = buildShareSummary(setup);

  await setDoc(doc(db, COLLECTION_NAME, shareId), {
    ownerId: setup.userId,
    setupId: setup.id,
    createdAt: serverTimestamp(),
    summary: summaryToFirestore(summary),
  });

  void trackEvent('public_share_created', {
    setupId: setup.id,
    hasLoggerEvidence: summary.hasLoggerEvidence,
  });

  return shareId;
};

export const deletePublicShare = async (shareId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, shareId));
};

export const getPublicShare = async (shareId: string): Promise<PublicShare | null> => {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, shareId));
  if (!snapshot.exists()) return null;
  return fromFirestoreDoc(snapshot.id, snapshot.data());
};

export const listMyPublicShares = async (userId: string): Promise<PublicShare[]> => {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where('ownerId', '==', userId)),
  );

  return snapshot.docs
    .map((share) => fromFirestoreDoc(share.id, share.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};
