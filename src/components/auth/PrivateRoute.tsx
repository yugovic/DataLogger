// プライベートルートコンポーネント
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { t } = useTranslation('common');
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <Spin fullscreen tip={t('loading')} />;
  }

  return currentUser ? <>{children}</> : <Navigate to="/auth" />;
};
