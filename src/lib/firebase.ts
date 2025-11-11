// Firebase初期化ファイル
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// 環境変数からFirebase設定を読み込み
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// デバッグ用：設定が正しく読み込まれているか確認
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'NOT SET',
  authDomain: firebaseConfig.authDomain || 'NOT SET',
  projectId: firebaseConfig.projectId || 'NOT SET',
  storageBucket: firebaseConfig.storageBucket || 'NOT SET',
  appId: firebaseConfig.appId ? 'SET' : 'NOT SET'
});

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// サービスの初期化
export const auth = getAuth(app);
export const db = getFirestore(app);
// オフライン永続化
enableIndexedDbPersistence(db).catch((err) => {
  console.warn('IndexedDB persistence not enabled:', err?.code || err);
});
// Analyticsは対応環境のみ
let analyticsInst: ReturnType<typeof getAnalytics> | undefined;
try {
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    analyticsInst = getAnalytics(app);
  }
} catch (e) {
  console.warn('Analytics not initialized:', e);
}
export const analytics = analyticsInst as any;
export const storage = getStorage(app);

export default app;
