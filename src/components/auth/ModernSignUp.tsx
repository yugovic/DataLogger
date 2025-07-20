import React, { useState } from 'react';
import { signUpWithEmail } from '../../services/authService';
import { message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface ModernSignUpProps {
  onSuccess: () => void;
  onLoginClick: () => void;
}

export const ModernSignUp: React.FC<ModernSignUpProps> = ({ onSuccess, onLoginClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      message.warning('すべての項目を入力してください');
      return;
    }

    if (password !== confirmPassword) {
      message.error('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      message.error('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      message.success('アカウントを作成しました');
      onSuccess();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        message.error('このメールアドレスは既に使用されています');
      } else if (error.code === 'auth/weak-password') {
        message.error('パスワードが弱すぎます');
      } else {
        message.error('アカウント作成に失敗しました');
      }
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
          <p className="text-gray-500">新規アカウントを作成</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSignUp} className="space-y-4">
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
              placeholder="6文字以上"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="もう一度入力"
              disabled={loading}
            />
          </div>

          <div className="flex items-start">
            <input
              id="terms"
              type="checkbox"
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              required
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
              <a href="#" className="text-blue-600 hover:text-blue-700">利用規約</a>と
              <a href="#" className="text-blue-600 hover:text-blue-700">プライバシーポリシー</a>
              に同意します
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingOutlined className="mr-2" />
                作成中...
              </span>
            ) : (
              'アカウントを作成'
            )}
          </button>
        </form>

        {/* ログインリンク */}
        <p className="text-center text-sm text-gray-600">
          既にアカウントをお持ちの方は{' '}
          <button
            onClick={onLoginClick}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            ログイン
          </button>
        </p>
      </div>
    </div>
  );
};