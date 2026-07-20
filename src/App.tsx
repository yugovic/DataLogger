// メインアプリケーション（認証機能統合版）
//
// useBlocker（未保存離脱ガード, CarSetup で使用）は data router でのみ動作するため、
// createBrowserRouter / RouterProvider を採用している。BrowserRouter へは戻さないこと。
import React, { Suspense, lazy, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { Login } from './components/auth/Login';
import { SignUp } from './components/auth/SignUp';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OnboardingWizard, checkOnboardingNeeded } from './components/onboarding/OnboardingWizard';
import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';
import { LocaleSelect } from './components/common/LocaleSelect';

const CarSetup = lazy(() => import('../CarSetup'));
const SetupHistory = lazy(() => import('./components/setup/SetupHistory').then((m) => ({ default: m.SetupHistory })));
const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const VehicleList = lazy(() => import('./components/vehicle/VehicleList').then((m) => ({ default: m.VehicleList })));
const BuildJournal = lazy(() => import('./components/vehicle/BuildJournal').then((m) => ({ default: m.BuildJournal })));
const TelemetryAnalysis = lazy(() => import('./components/telemetry/TelemetryAnalysis').then((m) => ({ default: m.TelemetryAnalysis })));
const TelemetryFileCompare = lazy(() => import('./components/telemetry/TelemetryFileCompare').then((m) => ({ default: m.TelemetryFileCompare })));
const TelemetryTraceCompare = lazy(() => import('./components/telemetry/TelemetryTraceCompare').then((m) => ({ default: m.TelemetryTraceCompare })));
const TelemetryDebrief = lazy(() => import('./components/telemetry/TelemetryDebrief').then((m) => ({ default: m.TelemetryDebrief })));
const TelemetryTraceList = lazy(() => import('./components/telemetry/TelemetryTraceList').then((m) => ({ default: m.TelemetryTraceList })));
const SetupCompare = lazy(() => import('./components/compare/SetupCompare').then((m) => ({ default: m.SetupCompare })));
const SharedBrowse = lazy(() => import('./components/share/SharedBrowse').then((m) => ({ default: m.SharedBrowse })));
const SharedSetupDetail = lazy(() => import('./components/share/SharedSetupDetail').then((m) => ({ default: m.SharedSetupDetail })));
const PublicShareLanding = lazy(() => import('./components/share/PublicShareLanding').then((m) => ({ default: m.PublicShareLanding })));

const RouteFallback: React.FC = () => (
  <div className="min-h-[100dvh] bg-slate-100 px-4 py-8 dark:bg-slate-950">
    <div className="mx-auto max-w-5xl animate-pulse space-y-4">
      <div className="h-14 rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="h-7 w-52 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-44 rounded-xl bg-white dark:bg-slate-900" />
      <div className="h-44 rounded-xl bg-white dark:bg-slate-900" />
    </div>
  </div>
);

const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!currentUser || loading) return;
    checkOnboardingNeeded(currentUser.uid).then((needed) => {
      setShowOnboarding(needed);
      setChecking(false);
    });
  }, [currentUser, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
};

// 認証ページ（ログイン/新規登録のトグルを内部 state で管理）
const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  return (
    <div className="relative flex min-h-[100dvh] w-full min-w-0 items-center justify-center overflow-x-hidden bg-slate-100 px-4 pb-8 pt-20 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:py-10">
      <LocaleSelect className="absolute right-4 top-4 w-28 sm:right-6 sm:top-6 sm:w-32" />
      {authMode === 'login' ? (
        <Login
          onSuccess={() => (window.location.href = '/')}
          onSignUpClick={() => setAuthMode('signup')}
        />
      ) : (
        <SignUp
          onSuccess={() => (window.location.href = '/')}
          onLoginClick={() => setAuthMode('login')}
        />
      )}
    </div>
  );
};

const router = createBrowserRouter([
  { path: '/auth', element: <AuthPage /> },
  { path: '/s/:shareId', element: <PublicShareLanding /> },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <OnboardingGate>
          <CarSetup />
        </OnboardingGate>
      </PrivateRoute>
    ),
  },
  {
    path: '/history',
    element: (
      <PrivateRoute>
        <SetupHistory />
      </PrivateRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/vehicles',
    element: (
      <PrivateRoute>
        <VehicleList />
      </PrivateRoute>
    ),
  },
  {
    path: '/vehicles/:id/journal',
    element: (
      <PrivateRoute>
        <BuildJournal />
      </PrivateRoute>
    ),
  },
  {
    path: '/setup/:id',
    element: (
      <PrivateRoute>
        <CarSetup />
      </PrivateRoute>
    ),
  },
  {
    path: '/compare',
    element: (
      <PrivateRoute>
        <SetupCompare />
      </PrivateRoute>
    ),
  },
  {
    path: '/shared',
    element: (
      <PrivateRoute>
        <SharedBrowse />
      </PrivateRoute>
    ),
  },
  {
    path: '/shared/:id',
    element: (
      <PrivateRoute>
        <SharedSetupDetail />
      </PrivateRoute>
    ),
  },
  {
    path: '/telemetry/compare',
    element: (
      <PrivateRoute>
        <TelemetryTraceCompare />
      </PrivateRoute>
    ),
  },
  {
    path: '/telemetry/debrief',
    element: (
      <PrivateRoute>
        <TelemetryDebrief />
      </PrivateRoute>
    ),
  },
  {
    path: '/telemetry/traces',
    element: (
      <PrivateRoute>
        <TelemetryTraceList />
      </PrivateRoute>
    ),
  },
  {
    path: '/telemetry/import',
    element: (
      <PrivateRoute>
        <TelemetryAnalysis />
      </PrivateRoute>
    ),
  },
  {
    path: '/telemetry/files',
    element: (
      <PrivateRoute>
        <TelemetryFileCompare />
      </PrivateRoute>
    ),
  },
  {
    path: '/telemetry',
    element: (
      <PrivateRoute>
        <TelemetryTraceList />
      </PrivateRoute>
    ),
  },
  { path: '*', element: <Navigate to="/" /> },
]);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocaleProvider>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </ErrorBoundary>
        </LocaleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
