import React from 'react';
import { Outlet } from 'react-router-dom';
import { DomainNavRail } from './DomainNavRail';
import { TopBar } from './TopBar';
import { ReconnectBanner } from './ReconnectBanner';
import { OfflineBanner } from './OfflineBanner';
import { NotificationPanel } from './NotificationPanel';
import { NavDrawer } from './NavDrawer';
import { BottomTabBar } from './BottomTabBar';
import { useUIStore } from '../stores/uiStore';

export const AppShell: React.FC = () => {
  const { showReconnectBanner } = useUIStore();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-surface-1)',
      }}
    >
      {/* Skip-to-content link — visible only on keyboard focus */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'var(--space-2)',
          zIndex: 'var(--z-tooltip)' as unknown as number,
          background: 'var(--color-brand-primary)',
          color: '#fff',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
          textDecoration: 'none',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.left = 'var(--space-2)'; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.left = '-9999px'; }}
      >
        Skip to main content
      </a>

      <OfflineBanner />
      {showReconnectBanner && <ReconnectBanner />}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left — persistent domain navigation rail (md+ only) */}
        <DomainNavRail />

        {/* Right — top bar + domain content + mobile bottom tab bar */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <TopBar />

          {/* Domain content area — each domain renders its layout via <Outlet> */}
          <main
            id="main-content"
            tabIndex={-1}
            style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
          </main>

          {/* Bottom tab bar — visible on xs/sm only, reserving space in the flex column */}
          <BottomTabBar />
        </div>

        {/* Slide-over notification panel */}
        <NotificationPanel />
      </div>

      {/* Mobile nav drawer — rendered at root so it overlays everything */}
      <NavDrawer />
    </div>
  );
};
