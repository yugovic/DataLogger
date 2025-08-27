// Firestore初期化チェック用ユーティリティ
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const checkFirestoreConnection = async (userId: string) => {
  try {
    console.log('Checking Firestore connection for user:', userId);
    
    // テストドキュメントを作成
    const testDocRef = doc(db, 'test', userId);
    await setDoc(testDocRef, {
      testField: 'test',
      timestamp: new Date()
    });
    
    // テストドキュメントを読み込み
    const testDoc = await getDoc(testDocRef);
    if (testDoc.exists()) {
      console.log('✅ Firestore connection successful');
      return true;
    } else {
      console.error('❌ Firestore test document not found');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Firestore connection failed:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    return false;
  }
};

export const initializeFirestoreCollections = async () => {
  try {
    console.log('Initializing Firestore collections...');
    
    // コレクションへの参照を作成（これだけではコレクションは作成されない）
    const setupsRef = collection(db, 'setups');
    console.log('Setups collection reference created');
    
    return true;
  } catch (error: any) {
    console.error('Failed to initialize Firestore collections:', error);
    return false;
  }
};