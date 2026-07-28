// Firebase初期化ファイル
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
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

// ショーケース/開発用: VITE_USE_EMULATOR=1 のときだけローカルEmulatorに接続する。
// 本番ビルドでは未設定=falseなので一切影響しない（デフォルトOFF）。
const useEmulator = import.meta.env.VITE_USE_EMULATOR === '1'
  || import.meta.env.VITE_USE_EMULATOR === 'true';

/**
 * オフライン永続化つきで Firestore を初期化する。
 *
 * ピットは電波が悪く、圏外で押した保存は IndexedDB のキューに積まれて
 * 電波復帰後に同期される。この永続化が効いていないと、圏外の保存は
 * リロードで消える。
 *
 * 旧 enableIndexedDbPersistence は複数タブが開いていると failed-precondition で
 * 失敗し、その場合は警告を出すだけで永続化なしのまま動いていた（＝黙ってデータを失う）。
 * persistentMultipleTabManager は複数タブを正式に扱えるので、その失敗モードごと無くす。
 *
 * 永続化を確立できたかは isPersistenceEnabled で参照でき、UI 側で正直に出す。
 */
export let isPersistenceEnabled = false;

function createDb() {
  // Emulator 接続時はブラウザ側の永続化を挟まない（検証時の状態を持ち越さないため）
  if (useEmulator) return getFirestore(app);
  try {
    const instance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    isPersistenceEnabled = true;
    return instance;
  } catch (err) {
    // プライベートブラウジング等で IndexedDB が使えない環境。
    // 記録自体は続けられるようメモリキャッシュで動かし、状態は UI に出す。
    console.warn('Firestore persistent cache unavailable, falling back to memory:', err);
    isPersistenceEnabled = false;
    return getFirestore(app);
  }
}

export const db = createDb();

if (useEmulator) {
  console.log('[emulator] connecting Auth :9099 / Firestore :8080');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
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
