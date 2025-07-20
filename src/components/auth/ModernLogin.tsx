import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle } from '../../services/authService';
import { message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface ModernLoginProps {
  onSuccess: () => void;
  onSignUpClick: () => void;
}

export const ModernLogin: React.FC<ModernLoginProps> = ({ onSuccess, onSignUpClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      message.warning('メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      message.success('ログインに成功しました');
      onSuccess();
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        message.error('ユーザーが見つかりません');
      } else if (error.code === 'auth/wrong-password') {
        message.error('パスワードが間違っています');
      } else {
        message.error('ログインに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      message.success('Googleアカウントでログインしました');
      onSuccess();
    } catch (error) {
      message.error('Googleログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            <span className="text-blue-600">VELOCITY</span>
            <span className="text-gray-900 ml-1">LOGGER</span>
          </h1>
          <p className="text-gray-500">アカウントにログイン</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">ログイン状態を保持</span>
            </label>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
              パスワードを忘れた？
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingOutlined className="mr-2" />
                ログイン中...
              </span>
            ) : (
              'ログイン'
            )}
          </button>
        </form>

        {/* 区切り線 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">または</span>
          </div>
        </div>

        {/* Googleログイン */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Googleでログイン
        </button>

        {/* サインアップリンク */}
        <p className="text-center text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <button
            onClick={onSignUpClick}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            新規登録
          </button>
        </p>
      </div>
    </div>
  );
};