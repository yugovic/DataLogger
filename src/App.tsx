// メインアプリケーション（認証機能統合版）
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './components/auth/Login';
import { SignUp } from './components/auth/SignUp';
import { PrivateRoute } from './components/auth/PrivateRoute';
import CarSetup from '../CarSetup';

const App: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const AuthPage = () => {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {authMode === 'login' ? (
          <Login
            onSuccess={() => window.location.href = '/'}
            onSignUpClick={() => setAuthMode('signup')}
          />
        ) : (
          <SignUp
            onSuccess={() => window.location.href = '/'}
            onLoginClick={() => setAuthMode('login')}
          />
        )}
      </div>
    );
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <CarSetup />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;