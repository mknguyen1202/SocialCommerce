import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStreamingStore } from '../stores/streamingStore';
import { LiveBadge } from './LiveBadge';
import { ViewerCount } from './ViewerCount';
import { useTheater } from '../hooks/useTheaters';

export const PictureInPicture: React.FC = () => {
  const navigate = useNavigate();
  const { activeTheaterId, isPiPActive, setPiPActive, setActiveTheaterId } = useStreamingStore();
  const { data: theater } = useTheater(activeTheaterId ?? '');

  if (!isPiPActive || !activeTheaterId || !theater) return null;

  const handleExpand = () => {
    setPiPActive(false);
    navigate(`/streaming/theater/${activeTheaterId}`);
  };

  const handleClose = () => {
    setPiPActive(false);
    setActiveTheaterId(null);
  };

  return (
    <div
      role="region"
      aria-label="Picture in picture player"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        width: 280,
        background: 'var(--color-surface-0)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        zIndex: 'var(--z-tooltip)' as unknown as number,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Player area */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={handleExpand}
        role="button"
        tabIndex={0}
        aria-label="Expand theater"
        onKeyDown={(e) => e.key === 'Enter' && handleExpand()}
      >
        <span style={{ fontSize: 32 }}>🎬</span>
        <div style={{ position: 'absolute', top: 6, left: 6 }}>
          <LiveBadge />
        </div>
      </div>

      {/* Info bar */}
      <div
        style={{
          padding: '6px var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {theater.title}
          </p>
          <ViewerCount count={theater.viewerCount} />
        </div>

        <button
          onClick={handleClose}
          aria-label="Close picture in picture"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 16,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
