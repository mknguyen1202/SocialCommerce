import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUIStore } from '../../app/stores/uiStore';
import { SocialLayout } from './SocialLayout';
import { FeedView } from './Feed/FeedView';
import { Skeleton } from '../../shared/components/Skeleton';

const PostDetail = lazy(() => import('./Post/PostDetail').then(m => ({ default: m.PostDetail })));
const GroupFeed = lazy(() => import('./Group/GroupFeed').then(m => ({ default: m.GroupFeed })));
const GroupDiscovery = lazy(() => import('./Group/GroupDiscovery').then(m => ({ default: m.GroupDiscovery })));
const UserWall = lazy(() => import('./Wall/UserWall').then(m => ({ default: m.UserWall })));

const RouteFallback = () => (
  <div style={{ padding: 'var(--space-6)', maxWidth: 760, margin: '0 auto' }}>
    <Skeleton variant="rect" width="100%" height={200} />
  </div>
);

const SocialDomain: React.FC = () => {
  const setActiveDomain = useUIStore((s) => s.setActiveDomain);

  useEffect(() => {
    setActiveDomain('social');
  }, [setActiveDomain]);

  return (
    <Routes>
      <Route element={<SocialLayout />}>
        <Route index element={<FeedView feedType="home" />} />
        <Route path="explore" element={<FeedView feedType="explore" />} />
        <Route path="post/:postId" element={<Suspense fallback={<RouteFallback />}><PostDetail /></Suspense>} />
        <Route path="group/:slug" element={<Suspense fallback={<RouteFallback />}><GroupFeed /></Suspense>} />
        <Route path="groups/discover" element={<Suspense fallback={<RouteFallback />}><GroupDiscovery /></Suspense>} />
        <Route path="wall/:userId" element={<Suspense fallback={<RouteFallback />}><UserWall /></Suspense>} />
        <Route path="*" element={<Navigate to="/social" replace />} />
      </Route>
    </Routes>
  );
};

export default SocialDomain;
