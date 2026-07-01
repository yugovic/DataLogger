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
import { toPublicVehicleProfile } from '../lib/vehicleProfilePublic';
import { CarSetup, SetupVisibility } from '../types/setup';
import { carSetupSchema } from '../schemas/setupSchema';
import logger from '../utils/logger';
import { trackEvent } from '../lib/analytics';
import { recomputeSharingActive } from './profileService';
import { getVehicle } from './vehicleService';

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

const resolveVehicleProfileSnapshot = async <
  T extends {
    userId?: string;
    vehicleId?: string | null;
    vehicleProfileSnapshot?: CarSetup['vehicleProfileSnapshot'];
  },
>(
  setup: T,
  options: { clearSnapshotOnNull: boolean } = { clearSnapshotOnNull: false },
): Promise<T> => {
  if (setup.vehicleId === undefined) return setup;

  if (setup.vehicleId === null) {
    if (!options.clearSnapshotOnNull) return setup;
    return {
      ...setup,
      vehicleProfileSnapshot: null,
    };
  }

  const vehicle = await getVehicle(setup.vehicleId);
  if (!vehicle) {
    throw new Error('選択された登録車両が見つかりません');
  }
  if (setup.userId && vehicle.userId !== setup.userId) {
    throw new Error('選択された登録車両を使用する権限がありません');
  }

  return {
    ...setup,
    vehicleProfileSnapshot: vehicle.profile ? toPublicVehicleProfile(vehicle.profile) : null,
  };
};

// セットアップデータの保存
export const saveSetup = async (setup: Omit<CarSetup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const setupWithSnapshot = await resolveVehicleProfileSnapshot(setup);

  // zodスキーマによる保存前バリデーション
  const parsed = carSetupSchema.safeParse(setupWithSnapshot);
  if (!parsed.success) {
    // フィールドパスと日本語メッセージを組み合わせて分かりやすいエラー文を生成
    const fieldLabels: Record<string, string> = {
      carModel: '車種',
      circuit: 'サーキット',
      userId: 'ユーザーID',
      date: '日時',
      'tireSettings.fl.before': 'FL 走行前空気圧',
      'tireSettings.fl.after': 'FL 走行後空気圧',
      'tireSettings.fr.before': 'FR 走行前空気圧',
      'tireSettings.fr.after': 'FR 走行後空気圧',
      'tireSettings.rl.before': 'RL 走行前空気圧',
      'tireSettings.rl.after': 'RL 走行後空気圧',
      'tireSettings.rr.before': 'RR 走行前空気圧',
      'tireSettings.rr.after': 'RR 走行後空気圧',
      'targetPressures.front': '目標温間圧 フロント',
      'targetPressures.rear': '目標温間圧 リア',
      'weather.airTemp': '気温',
      'weather.trackTemp': '路面温度',
      'weather.humidity': '湿度',
      'weather.pressure': '気圧',
      'sessionInfo.distance': '走行距離',
      'sessionInfo.fuel': '燃料量',
    };
    const msg = parsed.error.issues.map(i => {
      const path = i.path.join('.');
      const label = fieldLabels[path] ?? path;
      return `${label}: ${i.message}`;
    }).join(' / ');
    throw new Error(`入力値エラー: ${msg}`);
  }

  try {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const setupData = sanitizeForFirestore({
      ...setupWithSnapshot,
      date: setupWithSnapshot.date instanceof Date ? Timestamp.fromDate(setupWithSnapshot.date) : setupWithSnapshot.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    logger.log('Saving setup with userId:', setupWithSnapshot.userId);
    await setDoc(docRef, setupData);
    logger.log('Setup saved with ID:', docRef.id);
    // 保存成功時に計測イベントを発火（個人情報を渡さない）
    trackEvent('setup_saved', { circuit: setupWithSnapshot.circuit, car_model: setupWithSnapshot.carModel });
    return docRef.id;
  } catch (error: any) {
    logger.error('セットアップの保存に失敗しました:', error);
    throw error;
  }
};

// Firestoreドキュメント → CarSetup 変換（Timestamp→Date を一元処理）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromFirestoreDoc = (id: string, data: any): CarSetup => {
  const setup = {
    ...data,
    id,
    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
  } as CarSetup;
  // ロガー証憑の取込日時（ネストしたTimestamp）も変換
  const importedAt = data.lapTimeData?.evidence?.importedAt;
  if (importedAt?.toDate && setup.lapTimeData?.evidence) {
    setup.lapTimeData.evidence.importedAt = importedAt.toDate();
  }
  return setup;
};

// セットアップデータの取得
export const getSetup = async (setupId: string): Promise<CarSetup | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, setupId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return fromFirestoreDoc(docSnap.id, docSnap.data());
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
    return querySnapshot.docs.map(d => fromFirestoreDoc(d.id, d.data()));
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
    return querySnapshot.docs.map(d => fromFirestoreDoc(d.id, d.data()));
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
    const updatesWithSnapshot = await resolveVehicleProfileSnapshot(updates, { clearSnapshotOnNull: true });
    const updateData = sanitizeForFirestore({
      ...updatesWithSnapshot,
      updatedAt: serverTimestamp(),
      ...(updatesWithSnapshot.date ? {
        date: updatesWithSnapshot.date instanceof Date ? Timestamp.fromDate(updatesWithSnapshot.date) : updatesWithSnapshot.date
      } : {})
    });

    await updateDoc(docRef, updateData as any);
    // 更新成功時に計測イベントを発火
    trackEvent('setup_updated', { circuit: updatesWithSnapshot.circuit, car_model: updatesWithSnapshot.carModel });
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

// ─── Give-to-Get 共有（WP6） ──────────────────────────────────

/**
 * セットアップの公開設定（private⇄shared）を切り替える。
 *
 * 重要: anonymized=true で共有する場合、表示で隠すだけでは
 * Firestore 上の生データから driver が読めてしまう。よって **データ層で
 * driver を null に書き換える**（個人情報の物理的除去 / BUSINESS_PLAN 法務リスク対策）。
 * 呼び出し側はダイアログで「匿名共有ではドライバー名が削除される」旨の同意を取ること。
 *
 * 更新後は必ず recomputeSharingActive を実行し、users/{uid}.sharingActive を
 * 実際の共有件数に同期させる（相互性ルールの前提）。
 *
 * @param setupId 対象セットアップ ID
 * @param visibility 切替後の公開設定
 * @param anonymized 共有時に匿名化するか（private 化時は無視）
 * @param ownerId 呼び出しユーザー（=オーナー）の uid。sharingActive 再計算に使う
 * @param meta 計測用のメタ情報（個人情報は渡さない）
 */
export const setSetupVisibility = async (
  setupId: string,
  visibility: SetupVisibility,
  anonymized: boolean,
  ownerId: string,
  meta?: { circuit?: string; carModel?: string },
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, setupId);
    const updates: Record<string, unknown> = {
      visibility,
      updatedAt: serverTimestamp(),
    };

    if (visibility === 'shared') {
      updates.anonymized = anonymized;
      // 匿名共有: driver を物理的に除去（表示で隠すだけでは生データが読める）
      if (anonymized) {
        updates.driver = null;
      }
    } else {
      // private 化時は匿名フラグを下ろす（driver は復元しない＝既に消えているため）
      updates.anonymized = false;
    }

    // updateDoc の型は FieldValue を要求するため、既存 updateSetup と同様にキャスト
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(docRef, updates as any);

    // 共有件数に応じて sharingActive を再計算（相互性ルールの前提を同期）
    await recomputeSharingActive(ownerId);

    // 計測: 共有開始時のみ setup_shared を発火（個人情報は渡さない）
    if (visibility === 'shared') {
      trackEvent('setup_shared', { circuit: meta?.circuit, car_model: meta?.carModel });
    }
  } catch (error) {
    logger.error('公開設定の更新に失敗しました:', error);
    throw error;
  }
};

/** 共有ブラウズの絞り込み条件 */
export interface SharedSetupsFilter {
  circuit?: string | null;
  carModel?: string | null;
}

/**
 * 共有中（visibility==='shared'）のセットアップ一覧を取得する。
 *
 * circuit / carModel の等値フィルタはサーバー側で適用し（firestore.indexes.json
 * に visibility+circuit+date / visibility+carModel+date / 両方+date の複合
 * インデックスを定義済み）、常に date 降順でソートする。
 * 旧データ（visibility 欠落）は Firestore の等値マッチ対象外なので自然に除外される。
 *
 * 自分のドキュメントは where userId != が使えないためクライアント側で除外する。
 *
 * @param excludeUserId 除外する自分の uid
 * @param filter circuit / carModel の絞り込み（省略時は全件）
 * @param limitCount 取得上限
 */
export const getSharedSetups = async (
  excludeUserId: string,
  filter: SharedSetupsFilter = {},
  limitCount: number = 60,
): Promise<CarSetup[]> => {
  try {
    const constraints = [where('visibility', '==', 'shared')] as ReturnType<typeof where>[];
    if (filter.circuit) constraints.push(where('circuit', '==', filter.circuit));
    if (filter.carModel) constraints.push(where('carModel', '==', filter.carModel));

    const q = query(
      collection(db, COLLECTION_NAME),
      ...constraints,
      orderBy('date', 'desc'),
      // 自分の分を除外しても limit を満たせるよう少し多めに取る
      limit(limitCount + 20),
    );

    const snapshot = await getDocs(q);
    const all = snapshot.docs.map((d) => fromFirestoreDoc(d.id, d.data()));
    // 自分のドキュメントはクライアント側で除外
    return all.filter((s) => s.userId !== excludeUserId).slice(0, limitCount);
  } catch (error) {
    logger.error('共有セットアップ一覧の取得に失敗しました:', error);
    throw error;
  }
};

/**
 * 共有セットアップを1件取得する（読み取り専用の詳細表示用）。
 * 取得後に visibility==='shared' でないものは null を返す（自分のデータは
 * 通常の getSetup を使うこと）。ルール上、他人の private は read 自体が拒否される。
 */
export const getSharedSetup = async (setupId: string): Promise<CarSetup | null> => {
  const setup = await getSetup(setupId);
  if (!setup) return null;
  if (setup.visibility !== 'shared') return null;
  return setup;
};
