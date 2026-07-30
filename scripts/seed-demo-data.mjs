#!/usr/bin/env node
// デモデータ投入スクリプト（Firebase Emulator 専用）
//
// 使い方:
//   1) エミュレータ起動
//      ./node_modules/.bin/firebase emulators:start --only auth,firestore --project <projectId>
//   2) 投入
//      npm run demo:seed            # 既存ドキュメントを上書き（IDは固定）
//      npm run demo:seed -- --reset # デモユーザーの既存データを削除してから投入
//
// 安全性について:
// - このスクリプトは **常に** Auth/Firestore エミュレータへ接続する（connect*Emulator を無条件に呼ぶ）。
//   本番プロジェクトへ書き込む経路は存在しない。エミュレータが起動していなければ何もせず終了する。
// - 投入するのは src/demo/demoDataset.ts の固定データのみ。実ユーザーのデータには触れない。
// - 書き込みは Firestore ルールを通す（管理SDKを使わない）ため、
//   投入が成功すること自体がルール適合の検証になる。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const [FIRESTORE_HOST, FIRESTORE_PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const args = process.argv.slice(2);
const shouldReset = args.includes('--reset');

// ─── プロジェクトID解決 ──────────────────────────────────────

function readProjectId() {
  const fromArg = args.find((arg) => arg.startsWith('--project='));
  if (fromArg) return fromArg.slice('--project='.length);
  if (process.env.DEMO_SEED_PROJECT_ID) return process.env.DEMO_SEED_PROJECT_ID;

  const envPath = resolve(PROJECT_ROOT, '.env.local');
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, 'utf8').match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/m);
    if (match) return match[1].trim();
  }
  return 'demo-velocity-logger';
}

const projectId = readProjectId();

// ─── エミュレータ疎通確認 ────────────────────────────────────

async function assertEmulatorRunning() {
  const targets = [
    { name: 'Firestore', url: `http://${FIRESTORE_HOST}:${FIRESTORE_PORT}/` },
    { name: 'Auth', url: `http://${AUTH_EMULATOR_HOST}/` },
  ];

  for (const target of targets) {
    try {
      await fetch(target.url, { signal: AbortSignal.timeout(3000) });
    } catch {
      console.error(`✖ ${target.name} エミュレータへ接続できません: ${target.url}`);
      console.error('  先に次を実行してください:');
      console.error(`  ./node_modules/.bin/firebase emulators:start --only auth,firestore --project ${projectId}`);
      process.exit(1);
    }
  }
}

// ─── データセット読み込み（TypeScript を Vite 経由で評価） ────

async function loadDataset() {
  const { createServer } = await import('vite');
  const server = await createServer({
    configFile: false,
    root: PROJECT_ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, watch: null },
  });
  try {
    const mod = await server.ssrLoadModule('/src/demo/demoDataset.ts');
    return mod.buildDemoDataset();
  } finally {
    await server.close();
  }
}

// ─── Firestore 変換ヘルパー ──────────────────────────────────

/** Date を Timestamp に、undefined を落として Firestore が受け付ける形にする */
function toFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : toFirestore(item)));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const converted = toFirestore(item);
      if (converted !== undefined) out[key] = converted;
    }
    return out;
  }
  return value;
}

async function deleteOwned(db, collectionName, field, uid) {
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', uid)));
  await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref)));
  return snapshot.size;
}

// ─── 投入本体 ────────────────────────────────────────────────

async function seed() {
  await assertEmulatorRunning();

  const dataset = await loadDataset();
  const app = initializeApp({ apiKey: 'demo-emulator-key', projectId, authDomain: `${projectId}.firebaseapp.com` });
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FIRESTORE_HOST, Number(FIRESTORE_PORT));

  console.log(`▶ プロジェクト: ${projectId}（Auth ${AUTH_EMULATOR_HOST} / Firestore ${FIRESTORE_HOST}:${FIRESTORE_PORT}）`);

  const uidByOwner = new Map();

  for (const account of dataset.accounts) {
    const credential = await signInOrCreate(auth, account);
    const uid = credential.user.uid;
    uidByOwner.set(account.key, uid);

    const vehicles = dataset.vehicles.filter((entry) => entry.owner === account.key);
    const tireSets = dataset.tireSets.filter((entry) => entry.owner === account.key);
    const setups = dataset.setups.filter((entry) => entry.owner === account.key);
    const traces = dataset.telemetryTraces.filter((entry) => entry.owner === account.key);
    const shares = dataset.publicShares.filter((entry) => entry.owner === account.key);
    const entitlement = dataset.entitlements.find((entry) => entry.owner === account.key);

    if (shouldReset) {
      const removed = [
        await deleteOwned(db, 'publicShares', 'ownerId', uid),
        await deleteOwned(db, 'telemetryTraces', 'ownerId', uid),
        await deleteOwned(db, 'setups', 'userId', uid),
        await deleteOwned(db, 'tireSets', 'userId', uid),
        await deleteOwned(db, 'vehicles', 'userId', uid),
      ].reduce((a, b) => a + b, 0);
      console.log(`  ↺ ${account.email}: 既存 ${removed} 件を削除`);
    }

    const hasShared = setups.some((entry) => entry.data.visibility === 'shared');

    // 1. プロフィール（オンボーディング済みの状態にして初回ウィザードを出さない）
    await setDoc(
      doc(db, 'users', uid),
      {
        displayName: account.displayName,
        locale: account.locale,
        sharingActive: hasShared,
        onboardingCompleted: true,
        onboardingData: {
          homeCircuit: account.onboarding.homeCircuit,
          goalType: account.onboarding.goalType,
          targetLapTime: account.onboarding.targetLapTime,
          completedAt: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    // 2. 車両 → タイヤセット → 走行記録（参照される順）
    for (const vehicle of vehicles) {
      await setDoc(doc(db, 'vehicles', vehicle.id), {
        ...toFirestore(vehicle.data),
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const tireSet of tireSets) {
      await setDoc(doc(db, 'tireSets', tireSet.id), {
        ...toFirestore(tireSet.data),
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const setup of setups) {
      await setDoc(doc(db, 'setups', setup.id), {
        ...toFirestore(setup.data),
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. 共有権利証明（実体のある shared セットアップを指す必要がある）
    if (entitlement) {
      await setDoc(doc(db, 'sharingEntitlements', uid), {
        setupId: entitlement.setupId,
        updatedAt: serverTimestamp(),
      });
    }

    // 4. テレメトリトレース
    for (const trace of traces) {
      await setDoc(doc(db, 'telemetryTraces', trace.id), {
        ...toFirestore(trace.data),
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 5. 公開共有リンク（ルールが summary の形を検証する）
    for (const share of shares) {
      await setDoc(doc(db, 'publicShares', share.id), {
        ownerId: uid,
        setupId: share.setupId,
        createdAt: serverTimestamp(),
        summary: toFirestore(share.summary),
      });
    }

    console.log(
      `  ✓ ${account.email}（uid: ${uid}）: 車両 ${vehicles.length} / タイヤセット ${tireSets.length} / 走行記録 ${setups.length}（共有 ${setups.filter((s) => s.data.visibility === 'shared').length}） / ログ ${traces.length} / 公開リンク ${shares.length}`,
    );
  }

  await signOut(auth);

  const publicShare = dataset.publicShares[0];
  console.log('');
  console.log('▼ 確認用');
  console.log(`  ログイン: ${dataset.accounts[0].email} / ${dataset.accounts[0].password}`);
  console.log(`  共有ブラウズ相手: ${dataset.accounts[1].email} / ${dataset.accounts[1].password}`);
  if (publicShare) console.log(`  公開リンク: /s/${publicShare.id}`);
  console.log('  dev server: VITE_USE_EMULATOR=1 npx vite --port 5180 --strictPort');
}

async function signInOrCreate(auth, account) {
  try {
    return await signInWithEmailAndPassword(auth, account.email, account.password);
  } catch (error) {
    const code = error?.code ?? '';
    if (!['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(code)) {
      throw error;
    }
    const credential = await createUserWithEmailAndPassword(auth, account.email, account.password);
    await updateProfile(credential.user, { displayName: account.displayName });
    return credential;
  }
}

seed()
  .then(() => {
    console.log('\n✓ デモデータの投入が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✖ デモデータの投入に失敗しました');
    console.error(error);
    process.exit(1);
  });
