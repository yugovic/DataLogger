import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tireSetInputSchema } from '../schemas/tireSetSchema';
import type { TireSet, TireSetInput } from '../types/tire';

const COLLECTION_NAME = 'tireSets';

const parseInput = (input: TireSetInput): TireSetInput => tireSetInputSchema.parse(input);

const toDate = (value: Date | Timestamp | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
};

export async function getUserTireSets(userId: string): Promise<TireSet[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('userId', '==', userId)));
  return snapshot.docs
    .map((entry) => {
      const data = entry.data() as Omit<TireSet, 'id' | 'startedAt' | 'createdAt' | 'updatedAt'> & {
        startedAt?: Timestamp | null;
        createdAt?: Timestamp;
        updatedAt?: Timestamp;
      };
      return {
        ...data,
        id: entry.id,
        startedAt: toDate(data.startedAt),
        createdAt: toDate(data.createdAt) ?? new Date(),
        updatedAt: toDate(data.updatedAt) ?? new Date(),
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function addTireSet(input: TireSetInput): Promise<string> {
  const parsed = parseInput(input);
  const reference = await addDoc(collection(db, COLLECTION_NAME), {
    ...parsed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateTireSet(tireSetId: string, input: TireSetInput): Promise<void> {
  const parsed = parseInput(input);
  await updateDoc(doc(db, COLLECTION_NAME, tireSetId), {
    ...parsed,
    updatedAt: serverTimestamp(),
  });
}
