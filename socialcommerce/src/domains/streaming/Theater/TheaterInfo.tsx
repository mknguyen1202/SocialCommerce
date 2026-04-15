import React from 'react';
import type { Theater } from '../../../shared/types/domain';
import { LiveBadge } from '../shared/LiveBadge';
import { ViewerCount } from '../shared/ViewerCount';
import { Avatar } from '../../../shared/components/Avatar';
import { useStreamingStore } from '../stores/streamingStore';

interface TheaterInfoProps {
  theater: Theater;
}

export const TheaterInfo: React.FC<TheaterInfoProps> = ({ theater }) => {
  const { viewerCount } = useStreamingStore();
  const isLive = theater.status === 'live';

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {theater.title}
          </h1>

          {theater.description && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {theater.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
          {isLive && <LiveBadge />}
          <ViewerCount count={isLive ? viewerCount : theater.viewerCount} />
        </div>
      </div>

      {/* Host info + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Avatar
          src={theater.host.avatarUrl || null}
          initials={theater.host.displayName.charAt(0).toUpperCase()}
          size="sm"
          alt={theater.host.displayName}
        />
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {theater.host.displayName}
        </span>

        <span
          style={{
            marginLeft: 'var(--space-2)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-3)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
          }}
        >
          {theater.category}
        </span>

        {theater.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface-3)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 8px',
            }}
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};
