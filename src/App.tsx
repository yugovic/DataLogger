// メインアプリケーション（認証機能統合版）
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Login } from './components/auth/Login';
import { SignUp } from './components/auth/SignUp';
import { PrivateRoute } from './components/auth/PrivateRoute';
import CarSetup from '../CarSetup';
import { SetupHistory } from './components/setup/SetupHistory';
import { Dashboard } from './components/Dashboard';
import { VehicleList } from './components/vehicle/VehicleList';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import TelemetryComparison from './components/demo/TelemetryComparison';
import { SetupCompare } from './components/compare/SetupCompare';

const App: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const AuthPage = () => {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ErrorBoundary>
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
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <SetupHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <PrivateRoute>
                  <VehicleList />
                </PrivateRoute>
              }
            />
            <Route
              path="/setup/:id"
              element={
                <PrivateRoute>
                  <CarSetup />
                </PrivateRoute>
              }
            />
            <Route
              path="/compare"
              element={
                <PrivateRoute>
                  <SetupCompare />
                </PrivateRoute>
              }
            />
            <Route path="/demo/telemetry" element={<TelemetryComparison />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
