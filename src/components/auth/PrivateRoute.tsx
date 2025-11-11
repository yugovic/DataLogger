// プライベートルートコンポーネント
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spin } from 'antd';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <Spin fullscreen tip="読み込み中..." />;
  }

  return currentUser ? <>{children}</> : <Navigate to="/auth" />;
};
