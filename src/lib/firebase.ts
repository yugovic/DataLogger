// Firebase初期化ファイル
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
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

// ショーケース/開発用: VITE_USE_EMULATOR=1 のときだけローカルEmulatorに接続する。
// 本番ビルドでは未設定=falseなので一切影響しない（デフォルトOFF）。
const useEmulator = import.meta.env.VITE_USE_EMULATOR === '1'
  || import.meta.env.VITE_USE_EMULATOR === 'true';
if (useEmulator) {
  console.log('[emulator] connecting Auth :9099 / Firestore :8080');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// オフライン永続化（Emulator時はスキップ）
if (!useEmulator) {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn('IndexedDB persistence not enabled:', err?.code || err);
  });
}
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
