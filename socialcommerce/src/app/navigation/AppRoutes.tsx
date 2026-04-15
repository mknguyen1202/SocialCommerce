import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { RequireAuth } from '../../auth/RequireAuth';
import LoginPage from '../../pages/LoginPage';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

const CommunicationDomain = lazy(() => import('../../domains/communication'));
const SocialDomain = lazy(() => import('../../domains/social'));
const StreamingDomain = lazy(() => import('../../domains/streaming'));
const CommerceDomain = lazy(() => import('../../domains/commerce'));

const DomainFallback: React.FC = () => (
  <div style={{ flex: 1, padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    <Skeleton width={240} height={32} />
    <Skeleton width="60%" height={16} />
    <Skeleton width="80%" height={16} />
  </div>
);

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route
      element={
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      }
    >
      <Route index element={<Navigate to="/communication" replace />} />

      <Route
        path="communication/*"
        element={
          <ErrorBoundary>
            <Suspense fallback={<DomainFallback />}>
              <CommunicationDomain />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="social/*"
        element={
          <ErrorBoundary>
            <Suspense fallback={<DomainFallback />}>
              <SocialDomain />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="streaming/*"
        element={
          <ErrorBoundary>
            <Suspense fallback={<DomainFallback />}>
              <StreamingDomain />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="commerce/*"
        element={
          <ErrorBoundary>
            <Suspense fallback={<DomainFallback />}>
              <CommerceDomain />
            </Suspense>
          </ErrorBoundary>
        }
      />

      <Route path="*" element={<Navigate to="/communication" replace />} />
    </Route>

    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
