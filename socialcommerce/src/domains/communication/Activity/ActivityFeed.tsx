import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityFeed } from '../../../shared/hooks/useActivityFeed';
import { Avatar } from '../../../shared/components/Avatar';
import { Skeleton } from '../../../shared/components/Skeleton';
import { useUIStore } from '../../../app/stores/uiStore';
import type { ActivityEvent, NotificationDomain } from '../../../shared/types/domain';

const DOMAIN_ICON: Record<NotificationDomain, string> = {
  communication: '💬',
  social: '📰',
  streaming: '🎬',
  commerce: '🛒',
};

const EVENT_TYPE_LABEL: Record<ActivityEvent['type'], string> = {
  user_posted: 'posted',
  user_is_live: 'is now live',
  shop_sale: 'has a sale in their shop',
  friend_joined: 'joined the app',
  theater_started: 'started a theater',
};

interface ActivityItemProps {
  event: ActivityEvent;
  onNavigate: (domain: NotificationDomain, url: string) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ event, onNavigate }) => (
  <button
    onClick={() => onNavigate(event.domain, event.linkUrl)}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-2)',
      width: '100%',
      padding: 'var(--space-2) var(--space-3)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: 'var(--radius-sm)',
      transition: 'background var(--transition-fast)',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
  >
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <Avatar src={event.actor.avatarUrl} name={event.actor.displayName} size="md" />
      <span
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          fontSize: 11,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {DOMAIN_ICON[event.domain]}
      </span>
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          lineHeight: 'var(--line-height-base)',
        }}
      >
        <strong style={{ fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'] }}>
          {event.actor.displayName}
        </strong>{' '}
        {EVENT_TYPE_LABEL[event.type]}
      </p>
      {event.body && (
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.body}
        </p>
      )}
      <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
        {formatTimeAgo(event.createdAt)}
      </p>
    </div>
  </button>
);

function formatTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const ActivityFeed: React.FC = () => {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useActivityFeed();
  const navigate = useNavigate();
  const setActiveDomain = useUIStore((s) => s.setActiveDomain);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleNavigate = (domain: NotificationDomain, url: string) => {
    setActiveDomain(domain);
    navigate(url);
  };

  const allEvents = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-4)' }}>
      {isLoading && (
        <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <Skeleton variant="circle" width={32} height={32} />
              <Skeleton variant="text" lines={2} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && allEvents.length === 0 && (
        <div
          style={{
            padding: 'var(--space-6)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          No recent activity
        </div>
      )}

      {allEvents.map((event) => (
        <ActivityItem key={event.id} event={event} onNavigate={handleNavigate} />
      ))}

      {isFetchingNextPage && (
        <div style={{ padding: 'var(--space-3)' }}>
          <Skeleton variant="text" lines={2} />
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
};
