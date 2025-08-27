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

const COLLECTION_NAME = 'setups';

// セットアップデータの保存
export const saveSetup = async (setup: Omit<CarSetup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    console.log('Saving setup with userId:', setup.userId);
    const docRef = doc(collection(db, COLLECTION_NAME));
    const setupData = {
      ...setup,
      date: setup.date instanceof Date ? Timestamp.fromDate(setup.date) : setup.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('Setup data to save:', setupData);
    await setDoc(docRef, setupData);
    console.log('Setup saved with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('セットアップの保存に失敗しました:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
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
        date: data.date.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as CarSetup;
    }
    return null;
  } catch (error) {
    console.error('セットアップの取得に失敗しました:', error);
    throw error;
  }
};

// ユーザーのセットアップ一覧取得
export const getUserSetups = async (userId: string, limitCount: number = 20): Promise<CarSetup[]> => {
  try {
    console.log('Fetching setups for userId:', userId);
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Found', querySnapshot.size, 'setups');
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      } as CarSetup;
    });
  } catch (error: any) {
    console.error('セットアップ一覧の取得に失敗しました:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
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
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        date: data.date.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as CarSetup;
    });
  } catch (error) {
    console.error('車種別セットアップの取得に失敗しました:', error);
    throw error;
  }
};

// セットアップデータの更新
export const updateSetup = async (setupId: string, updates: Partial<CarSetup>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, setupId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    if (updates.date) {
      updateData.date = updates.date instanceof Date ? Timestamp.fromDate(updates.date) as any : updates.date;
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('セットアップの更新に失敗しました:', error);
    throw error;
  }
};

// セットアップデータの削除
export const deleteSetup = async (setupId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, setupId));
  } catch (error) {
    console.error('セットアップの削除に失敗しました:', error);
    throw error;
  }
};