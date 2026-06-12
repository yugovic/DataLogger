// Firestoreでのセットアップデータ管理サービス
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CarSetup } from '../types/setup';
import { carSetupSchema } from '../schemas/setupSchema';
import logger from '../utils/logger';
import { trackEvent } from '../lib/analytics';

const COLLECTION_NAME = 'setups';

/**
 * 保存ペイロードから undefined を再帰的に除去し null に統一する。
 * Firestore は undefined を保存できないため必須。
 */
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

// セットアップデータの保存
export const saveSetup = async (setup: Omit<CarSetup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // zodスキーマによる保存前バリデーション
  const parsed = carSetupSchema.safeParse(setup);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(' / ');
    throw new Error(`入力値エラー: ${msg}`);
  }

  try {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const setupData = sanitizeForFirestore({
      ...setup,
      date: setup.date instanceof Date ? Timestamp.fromDate(setup.date) : setup.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    logger.log('Saving setup with userId:', setup.userId);
    await setDoc(docRef, setupData);
    logger.log('Setup saved with ID:', docRef.id);
    // 保存成功時に計測イベントを発火（個人情報を渡さない）
    trackEvent('setup_saved', { circuit: setup.circuit, car_model: setup.carModel });
    return docRef.id;
  } catch (error: any) {
    logger.error('セットアップの保存に失敗しました:', error);
    throw error;
  }
};

// セットアップデータの取得
export const getSetup = async (setupId: string): Promise<CarSetup | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, setupId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      } as CarSetup;
    }
    return null;
  } catch (error) {
    logger.error('セットアップの取得に失敗しました:', error);
    throw error;
  }
};

// ユーザーのセットアップ一覧取得
export const getUserSetups = async (userId: string, limitCount: number = 20): Promise<CarSetup[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    logger.log('Found', querySnapshot.size, 'setups');
    return querySnapshot.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      } as CarSetup;
    });
  } catch (error: any) {
    logger.error('セットアップ一覧の取得に失敗しました:', error);
    throw error;
  }
};

// 車種別セットアップ取得
export const getSetupsByCarModel = async (userId: string, carModel: string): Promise<CarSetup[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('carModel', '==', carModel),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      } as CarSetup;
    });
  } catch (error) {
    logger.error('車種別セットアップの取得に失敗しました:', error);
    throw error;
  }
};

// セットアップデータの更新
export const updateSetup = async (setupId: string, updates: Partial<CarSetup>): Promise<void> => {
  // 更新時も部分バリデーション（circuit/carModelが含まれる場合は必須チェック）
  if (updates.circuit !== undefined && !updates.circuit) {
    throw new Error('サーキット名を入力してください');
  }
  if (updates.carModel !== undefined && !updates.carModel) {
    throw new Error('車種を入力してください');
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, setupId);
    const updateData = sanitizeForFirestore({
      ...updates,
      updatedAt: serverTimestamp(),
      ...(updates.date ? {
        date: updates.date instanceof Date ? Timestamp.fromDate(updates.date) : updates.date
      } : {})
    });

    await updateDoc(docRef, updateData as any);
    // 更新成功時に計測イベントを発火
    trackEvent('setup_updated', { circuit: updates.circuit, car_model: updates.carModel });
  } catch (error) {
    logger.error('セットアップの更新に失敗しました:', error);
    throw error;
  }
};

// セットアップデータの削除
export const deleteSetup = async (setupId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, setupId));
    // 削除成功時に計測イベントを発火
    trackEvent('setup_deleted', {});
  } catch (error) {
    logger.error('セットアップの削除に失敗しました:', error);
    throw error;
  }
};
