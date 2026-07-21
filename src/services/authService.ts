// Firebase認証サービス
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged,
  NextOrObserver
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { TFunction } from 'i18next';

// Googleプロバイダーの設定
const googleProvider = new GoogleAuthProvider();

// ユーザー情報をFirestoreに保存
const createUserDocument = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { displayName, email, photoURL } = user;
    try {
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('ユーザードキュメントの作成に失敗しました', error);
    }
  }
  return userRef;
};

// メールアドレスとパスワードでサインアップ
export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // 表示名を設定
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Firestoreにユーザー情報を保存
    await createUserDocument(user);
    
    return user;
  } catch (error: any) {
    console.error('サインアップエラー:', error);
    throw error;
  }
};

// メールアドレスとパスワードでログイン
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  } catch (error: any) {
    console.error('ログインエラー:', error);
    throw error;
  }
};

// Googleアカウントでログイン
export const signInWithGoogle = async () => {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    // Firestoreにユーザー情報を保存
    await createUserDocument(user);
    return user;
  } catch (error: any) {
    console.error('Googleログインエラー:', error);
    throw error;
  }
};

// ログアウト
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};

// パスワードリセットメール送信
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('パスワードリセットエラー:', error);
    throw error;
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: NextOrObserver<User>) => {
  return onAuthStateChanged(auth, callback);
};

// 現在のユーザー取得
export const getCurrentUser = () => {
  return auth.currentUser;
};

// エラーメッセージの日本語化
export const getAuthErrorMessage = (errorCode: string, t?: TFunction): string => {
  const key = (() => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse';
    case 'auth/weak-password':
      return 'weakPassword';
    case 'auth/invalid-email':
      return 'invalidEmail';
    case 'auth/user-not-found':
      return 'userNotFound';
    case 'auth/wrong-password':
      return 'wrongPassword';
    case 'auth/user-disabled':
      return 'userDisabled';
    case 'auth/too-many-requests':
      return 'tooManyRequests';
    case 'auth/popup-closed-by-user':
      return 'popupClosed';
    case 'auth/popup-blocked':
      return 'popupBlocked';
    case 'auth/cancelled-popup-request':
      return 'popupInProgress';
    case 'auth/operation-not-allowed':
      return 'operationNotAllowed';
    case 'auth/unauthorized-domain':
      return 'unauthorizedDomain';
    default:
      console.error('認証エラーコード:', errorCode);
      return 'unknown';
  }
  })();

  if (t) return t(`errors.auth.${key}`);

  const fallback: Record<string, string> = {
    emailAlreadyInUse: 'このメールアドレスは既に使用されています。',
    weakPassword: 'パスワードは6文字以上で設定してください。',
    invalidEmail: 'メールアドレスの形式が正しくありません。',
    userNotFound: 'ユーザーが見つかりません。',
    wrongPassword: 'パスワードが間違っています。',
    userDisabled: 'このアカウントは無効化されています。',
    tooManyRequests: 'ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。',
    popupClosed: 'ログインがキャンセルされました。',
    popupBlocked: 'ポップアップがブロックされました。ポップアップを許可してください。',
    popupInProgress: '別のポップアップリクエストが進行中です。',
    operationNotAllowed: 'この認証方法は無効になっています。',
    unauthorizedDomain: 'このドメインは認証されていません。',
    unknown: `認証処理に失敗しました。(${errorCode})`,
  };
  return fallback[key];
};
