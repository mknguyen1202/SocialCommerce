import React, { Suspense } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useStreamingStore } from './stores/streamingStore';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { TheaterBrowser } from './Discovery/TheaterBrowser';
import { Button } from '../../shared/components/Button';

const CreateTheaterModal = React.lazy(() => import('./Create/CreateTheaterModal').then(m => ({ default: m.CreateTheaterModal })));
const PictureInPicture = React.lazy(() => import('./shared/PictureInPicture').then(m => ({ default: m.PictureInPicture })));
const TheaterView = React.lazy(() => import('./Theater/TheaterView').then(m => ({ default: m.TheaterView })));

const SIDEBAR_WIDTH = 200;

export const StreamingLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const { isCreateModalOpen, openCreateModal, closeCreateModal, isPiPActive, activeTheaterId } = useStreamingStore();

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    textDecoration: 'none',
    fontSize: 'var(--font-size-sm)',
    fontWeight: (isActive
      ? 'var(--font-weight-semibold)'
      : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-surface-3)' : 'transparent',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
  });

  const mobileNavItemStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    paddingInline: 'var(--space-3)',
    height: 28,
    borderRadius: 'var(--radius-full)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontSize: 'var(--font-size-sm)',
    fontWeight: (isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-surface-3)' : 'transparent',
    border: `1px solid ${isActive ? 'var(--color-border-default)' : 'transparent'}`,
    transition: 'background var(--transition-fast)',
  });

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar — hidden on mobile (xs/sm) */}
      {!isMobile && (
        <aside
          aria-label="Streaming navigation"
          style={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            background: 'var(--color-surface-0)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderRight: '1px solid var(--color-border-default)',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: 'var(--space-3)' }}>
            <Button
              variant="primary"
              size="sm"
              style={{ width: '100%', marginBottom: 'var(--space-3)' }}
              onClick={openCreateModal}
            >
              🔴 Go Live
            </Button>

            <nav>
              <NavLink to="/streaming" end style={navLinkStyle}>
                🏠 Browse
              </NavLink>
            </nav>
          </div>
        </aside>
      )}

      {/* Content area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile sub-nav strip — only visible on xs/sm */}
        {isMobile && (
          <nav aria-label="Streaming navigation" className="mobile-sub-nav">
            <NavLink to="/streaming" end style={mobileNavItemStyle}>🏠 Browse</NavLink>
            <button
              onClick={openCreateModal}
              style={{
                ...mobileNavItemStyle({ isActive: false }),
                background: 'var(--color-danger)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                marginLeft: 'var(--space-2)',
              }}
            >
              🔴 Go Live
            </button>
          </nav>
        )}
        <Routes>
          <Route index element={<TheaterBrowser />} />
          <Route path="theater/:id" element={<Suspense fallback={null}><TheaterView /></Suspense>} />
          <Route path="*" element={<Navigate to="/streaming" replace />} />
        </Routes>
      </main>

      {/* Create modal */}
      {isCreateModalOpen && (
        <Suspense fallback={null}>
          <CreateTheaterModal isOpen={isCreateModalOpen} onClose={closeCreateModal} />
        </Suspense>
      )}

      {/* Picture-in-picture overlay */}
      {isPiPActive && activeTheaterId && (
        <Suspense fallback={null}>
          <PictureInPicture />
        </Suspense>
      )}
    </div>
  );
};
