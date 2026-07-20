// ユーザープロフィール（users/{uid}）管理サービス
//
// Give-to-Get（BUSINESS_PLAN Phase 0c）の相互性は firestore.rules が
// users/{uid}.sharingActive を get() で参照して強制する。このサービスは
// その sharingActive を「共有中セットアップが1件以上あるか」で正しく
// 同期させる責務を持つ。フラグの真偽が事業の信頼そのものなので、
// 共有状態を変えた直後に必ず recomputeSharingActive を呼ぶこと。

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import logger from '../utils/logger';
import type { SupportedLocale } from '../i18n/locale';

const USERS_COLLECTION = 'users';
const SETUPS_COLLECTION = 'setups';
const SHARING_ENTITLEMENTS_COLLECTION = 'sharingEntitlements';

/** プロフィール文書のうち本機能で参照する形 */
export interface UserProfile {
  uid: string;
  displayName: Maybe<string>;
  locale: Maybe<SupportedLocale>;
  /** 共有中（visibility==='shared'）のセットアップが1件以上あるか */
  sharingActive: boolean;
}

type Maybe<T> = T | null;

/**
 * users/{uid} プロフィールを取得する。
 * 文書が無い、または sharingActive 未設定の場合は sharingActive=false 扱い。
 */
export const getUserProfile = async (uid: string): Promise<UserProfile> => {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    const data = snap.exists() ? snap.data() : null;
    return {
      uid,
      displayName: (data?.displayName as string | undefined) ?? null,
      locale: data?.locale === 'ja-JP' || data?.locale === 'en' ? data.locale : null,
      // 旧プロフィール（sharingActive 無し）は未共有として扱う
      sharingActive: data?.sharingActive === true,
    };
  } catch (error) {
    logger.error('プロフィールの取得に失敗しました:', error);
    throw error;
  }
};

/** 表示言語だけをプロフィールへ保存する。ほかのプロフィール値は変更しない。 */
export const updateUserLocale = async (uid: string, locale: SupportedLocale): Promise<void> => {
  try {
    await setDoc(
      doc(db, USERS_COLLECTION, uid),
      { locale, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    logger.error('表示言語の更新に失敗しました:', error);
    throw error;
  }
};

/**
 * プロフィール文書の存在を保証する（初回作成）。
 * 既存フィールド（displayName 等、authService が作成済み）は壊さず、
 * sharingActive が未設定なら false で初期化する。merge で冪等。
 */
export const ensureUserProfile = async (
  uid: string,
  displayName?: Maybe<string>,
): Promise<void> => {
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : null;

    const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (!snap.exists()) {
      patch.createdAt = serverTimestamp();
    }
    // sharingActive が無ければ false で初期化（既存値は尊重）
    if (data?.sharingActive === undefined) {
      patch.sharingActive = false;
    }
    // displayName が未設定で引数があれば補完（既存値は上書きしない）
    if (displayName && !data?.displayName) {
      patch.displayName = displayName;
    }

    await setDoc(ref, patch, { merge: true });
  } catch (error) {
    logger.error('プロフィールの初期化に失敗しました:', error);
    throw error;
  }
};

/**
 * 共有中セットアップ件数を数え、users/{uid}.sharingActive を更新する。
 *
 * 自分の setups（オーナー read 可）を userId で取得し、クライアント側で
 * visibility==='shared' を数える（userId 等値クエリは複合インデックス不要）。
 * 共有を全解除した瞬間に sharingActive=false となり、ブラウズ権限が自然に失われる。
 *
 * @returns 更新後の sharingActive 値
 */
export const recomputeSharingActive = async (uid: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, SETUPS_COLLECTION),
      where('userId', '==', uid),
    );
    const snap = await getDocs(q);
    const sharedSetup = snap.docs.find((d) => d.data().visibility === 'shared');
    const hasShared = Boolean(sharedSetup);

    const entitlementRef = doc(db, SHARING_ENTITLEMENTS_COLLECTION, uid);
    if (sharedSetup) {
      // Firestore rules が参照先の所有者と visibility を再検証するため、自己申告で
      // entitlement を作っても共有データが無ければ認可されない。
      await setDoc(entitlementRef, {
        setupId: sharedSetup.id,
        updatedAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(entitlementRef).catch((error: unknown) => {
        const code = (error as { code?: string })?.code;
        if (code !== 'not-found') throw error;
      });
    }

    await setDoc(
      doc(db, USERS_COLLECTION, uid),
      { sharingActive: hasShared, updatedAt: serverTimestamp() },
      { merge: true },
    );
    logger.log('recomputeSharingActive:', uid, '→', hasShared);
    return hasShared;
  } catch (error) {
    logger.error('共有状態の再計算に失敗しました:', error);
    throw error;
  }
};

/** Firestore rules と同じ権利証明の有無をUIゲートでも使用する。 */
export const hasSharingEntitlement = async (uid: string): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, SHARING_ENTITLEMENTS_COLLECTION, uid));
    return snap.exists() && typeof snap.data().setupId === 'string';
  } catch (error) {
    logger.error('共有権利の確認に失敗しました:', error);
    throw error;
  }
};
