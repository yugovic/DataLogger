// ログインコンポーネント
import React, { useState } from 'react';
import { Input, Button, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { signInWithEmail, signInWithGoogle, getAuthErrorMessage } from '../../services/authService';

interface LoginProps {
  onSuccess?: () => void;
  onSignUpClick?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onSignUpClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      message.error('メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      message.success('ログインしました');
      onSuccess?.();
    } catch (error: any) {
      message.error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      message.success('ログインしました');
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
      
      <div className="space-y-4">
        <Input
          prefix={<MailOutlined className="text-gray-400" />}
          placeholder="メールアドレス"
          type="email"
          size="large"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onPressEnter={handleEmailLogin}
        />
        
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="パスワード"
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleEmailLogin}
        />
        
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleEmailLogin}
          className="bg-blue-500 hover:bg-blue-600"
        >
          ログイン
        </Button>
        
        <Divider>または</Divider>
        
        <Button
          size="large"
          block
          icon={<GoogleOutlined />}
          loading={loading}
          onClick={handleGoogleLogin}
        >
          Googleでログイン
        </Button>
        
        <div className="text-center mt-4">
          <span className="text-gray-600">アカウントをお持ちでない方は</span>
          <Button
            type="link"
            onClick={onSignUpClick}
            className="p-0 ml-1"
          >
            新規登録
          </Button>
        </div>
      </div>
    </div>
  );
};