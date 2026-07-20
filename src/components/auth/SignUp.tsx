// サインアップコンポーネント
import React, { useState } from 'react';
import { Input, Button, message, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { signUpWithEmail, signInWithGoogle, getAuthErrorMessage } from '../../services/authService';
import { useTranslation } from 'react-i18next';
import logger from '../../utils/logger';

interface SignUpProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSuccess, onLoginClick }) => {
  const { t } = useTranslation(['auth', 'errors']);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!displayName || !email || !password) {
      message.error(t('auth:errors.missingFields'));
      return;
    }

    if (password !== confirmPassword) {
      message.error(t('auth:errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      message.error(t('auth:errors.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName);
      message.success(t('auth:success.accountCreated'));
      onSuccess?.();
    } catch (error: any) {
      logger.error('SignUp error:', error);
      message.error(getAuthErrorMessage(error.code, t));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      message.success(t('auth:success.accountCreated'));
      onSuccess?.();
    } catch (error: any) {
      message.error(getAuthErrorMessage(error.code, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[22rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-0 p-5 sm:p-7">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <span className="text-sm font-black">VL</span>
          </div>
          <div>
            <h2 className="text-xl font-black leading-none text-slate-950 dark:text-white">VELOCITY</h2>
            <div className="mt-1 text-[10px] font-bold tracking-[0.24em] text-blue-600 dark:text-blue-400">LOGGER</div>
          </div>
        </div>
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('auth:driverAccess')}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t('auth:signUp')}</h3>
        </div>
      
      <div className="min-w-0 space-y-4">
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder={t('auth:displayName')}
          size="large"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        
        <Input
          prefix={<MailOutlined className="text-gray-400" />}
          placeholder={t('auth:email')}
          type="email"
          size="large"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder={t('auth:passwordMinimum')}
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder={t('auth:passwordConfirm')}
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
          className="bg-slate-950 hover:!bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:!bg-slate-200"
        >
          {t('auth:createAccount')}
        </Button>
        
        <Divider>{t('auth:or')}</Divider>
        
        <Button
          size="large"
          block
          icon={<GoogleOutlined />}
          loading={loading}
          onClick={handleGoogleSignUp}
        >
          {t('auth:googleSignUp')}
        </Button>
        
        <div className="text-center mt-4">
          <span className="text-gray-600 dark:text-gray-400">{t('auth:hasAccount')}</span>
          <Button
            type="link"
            onClick={onLoginClick}
            className="p-0 ml-1"
          >
            {t('auth:login')}
          </Button>
        </div>
      </div>
      </div>
      <div className="h-1 bg-[linear-gradient(90deg,#2563eb_0%,#2563eb_24%,#0f172a_24%,#0f172a_48%,#e2e8f0_48%,#e2e8f0_100%)] dark:bg-[linear-gradient(90deg,#3b82f6_0%,#3b82f6_24%,#f8fafc_24%,#f8fafc_48%,#1e293b_48%,#1e293b_100%)]" />
    </div>
  );
};
