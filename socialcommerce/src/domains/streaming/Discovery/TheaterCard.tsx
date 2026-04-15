import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Theater } from '../../../shared/types/domain';
import { Avatar } from '../../../shared/components/Avatar';
import { LiveBadge } from '../shared/LiveBadge';
import { ViewerCount } from '../shared/ViewerCount';

interface TheaterCardProps {
  theater: Theater;
}

export const TheaterCard: React.FC<TheaterCardProps> = React.memo(({ theater }) => {
  const navigate = useNavigate();

  const isLive = theater.status === 'live';

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Theater: ${theater.title}`}
      onClick={() => navigate(`/streaming/theater/${theater.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/streaming/theater/${theater.id}`)}
      style={{
        background: 'var(--color-surface-3)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid var(--color-border-default)',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'var(--color-surface-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 40 }}>🎬</span>

        {isLive && (
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            <LiveBadge />
          </div>
        )}

        {theater.status === 'scheduled' && theater.scheduledAt && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontSize: 'var(--font-size-xs)',
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {theater.scheduledAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {isLive && (
          <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
            <ViewerCount count={theater.viewerCount} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          <Avatar
            src={theater.host.avatarUrl || null}
            initials={theater.host.displayName.charAt(0).toUpperCase()}
            size="sm"
            alt={theater.host.displayName}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {theater.title}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              {theater.host.displayName}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              {theater.category}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
});
