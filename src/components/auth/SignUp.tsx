// サインアップコンポーネント
import React, { useState } from 'react';
import { Input, Button, message, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { signUpWithEmail, signInWithGoogle, getAuthErrorMessage } from '../../services/authService';

interface SignUpProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSuccess, onLoginClick }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    console.log('SignUp attempt:', { displayName, email, passwordLength: password.length });
    
    if (!displayName || !email || !password) {
      message.error('すべての項目を入力してください');
      return;
    }

    if (password !== confirmPassword) {
      message.error('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      message.error('パスワードは6文字以上で設定してください');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName);
      message.success('アカウントを作成しました');
      onSuccess?.();
    } catch (error: any) {
      console.error('SignUp error:', error);
      message.error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      message.success('アカウントを作成しました');
      onSuccess?.();
    } catch (error: any) {
      message.error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        <span className="text-blue-500">VELOCITY</span> <span className="text-gray-800">LOGGER</span>
      </h2>
      <h3 className="text-lg text-center text-gray-600 mb-6">新規アカウント作成</h3>
      
      <div className="space-y-4">
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder="表示名"
          size="large"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        
        <Input
          prefix={<MailOutlined className="text-gray-400" />}
          placeholder="メールアドレス"
          type="email"
          size="large"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="パスワード（6文字以上）"
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="パスワード（確認）"
          size="large"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onPressEnter={handleSignUp}
        />
        
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleSignUp}
          className="bg-blue-500 hover:bg-blue-600"
        >
          アカウント作成
        </Button>
        
        <Divider>または</Divider>
        
        <Button
          size="large"
          block
          icon={<GoogleOutlined />}
          loading={loading}
          onClick={handleGoogleSignUp}
        >
          Googleで登録
        </Button>
        
        <div className="text-center mt-4">
          <span className="text-gray-600">既にアカウントをお持ちの方は</span>
          <Button
            type="link"
            onClick={onLoginClick}
            className="p-0 ml-1"
          >
            ログイン
          </Button>
        </div>
      </div>
    </div>
  );
};