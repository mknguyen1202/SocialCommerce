import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { Skeleton } from '../../shared/components/Skeleton';
import { Avatar } from '../../shared/components/Avatar';
import { Icon } from '../../shared/components/Icon';
import { MessageSquare, Newspaper, Clapperboard, ShoppingBag, Bell, X } from '../../shared/components/iconRegistry';
import type { LucideIcon } from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../shared/hooks/useNotifications';
import type { AppNotification, NotificationDomain } from '../../shared/types/domain';

const DOMAIN_COLOR: Record<NotificationDomain, string> = {
  communication: 'var(--color-brand-primary)',
  social: 'var(--color-success)',
  streaming: 'var(--color-danger)',
  commerce: 'var(--color-warning)',
};

const DOMAIN_ICON: Record<NotificationDomain, LucideIcon> = {
  communication: MessageSquare,
  social: Newspaper,
  streaming: Clapperboard,
  commerce: ShoppingBag,
};

function formatTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onNavigate: (url: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onNavigate }) => {
  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
    onNavigate(notification.linkUrl);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        width: '100%',
        padding: 'var(--space-3) var(--space-4)',
        background: notification.isRead ? 'none' : 'rgba(var(--color-brand-primary-rgb, 99,102,241), 0.06)',
        border: 'none',
        borderLeft: `3px solid ${notification.isRead ? 'transparent' : DOMAIN_COLOR[notification.domain]}`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition-fast)',
        borderBottom: '1px solid var(--color-border-muted)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = notification.isRead ? 'none' : 'rgba(var(--color-brand-primary-rgb, 99,102,241), 0.06)')}
    >
      {/* Actor avatar with domain badge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {notification.actorAvatarUrl || notification.actorName ? (
          <Avatar
            src={notification.actorAvatarUrl}
            name={notification.actorName}
            size="lg"
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: DOMAIN_COLOR[notification.domain],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Icon icon={DOMAIN_ICON[notification.domain]} size={16} />
          </div>
        )}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: DOMAIN_COLOR[notification.domain],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Icon icon={DOMAIN_ICON[notification.domain]} size={8} strokeWidth={2.5} />
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            fontWeight: notification.isRead
              ? ('var(--font-weight-normal)' as React.CSSProperties['fontWeight'])
              : ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight']),
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--line-height-base)',
          }}
        >
          {notification.title}
        </p>
        {notification.body && (
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
            {notification.body}
          </p>
        )}
        <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <span
          aria-label="Unread"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: DOMAIN_COLOR[notification.domain],
            flexShrink: 0,
            marginTop: 4,
          }}
        />
      )}
    </button>
  );
};

export const NotificationPanel: React.FC = () => {
  const { isNotificationPanelOpen, closeNotificationPanel, setActiveDomain } = useUIStore();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNavigate = (linkUrl: string) => {
    // Infer domain from URL prefix and switch active domain
    if (linkUrl.startsWith('/communication')) setActiveDomain('communication');
    else if (linkUrl.startsWith('/social')) setActiveDomain('social');
    else if (linkUrl.startsWith('/streaming')) setActiveDomain('streaming');
    else if (linkUrl.startsWith('/commerce')) setActiveDomain('commerce');
    navigate(linkUrl);
    closeNotificationPanel();
  };

  if (!isNotificationPanelOpen) return null;

  return (
    <>
      {/* Backdrop (click outside to close) */}
      <div
        aria-hidden="true"
        onClick={closeNotificationPanel}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--z-modal-backdrop)' as unknown as number,
        }}
      />

      <aside
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 'var(--topbar-height)',
          right: 0,
          width: 360,
          height: 'calc(100vh - var(--topbar-height))',
          background: 'var(--color-surface-2)',
          borderLeft: '1px solid var(--color-border-default)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 'var(--z-modal)' as unknown as number,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border-default)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  background: 'var(--color-brand-primary)',
                  color: '#fff',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 6px',
                  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                }}
              >
                {unreadCount}
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand-primary)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  padding: '2px 4px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Mark all read
              </button>
            )}
            <button
              aria-label="Close notifications"
              onClick={closeNotificationPanel}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              padding: 4,
            }}
          >
            <Icon icon={X} size={16} />
          </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Skeleton variant="circle" width={36} height={36} />
                  <Skeleton variant="text" lines={2} style={{ flex: 1 }} />
                </div>
              ))}
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div
              style={{
                padding: 'var(--space-8)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}><Icon icon={Bell} size={40} /></div>
              You&rsquo;re all caught up!
            </div>
          )}

          {!isLoading &&
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markRead}
                onNavigate={handleNavigate}
              />
            ))}
        </div>
      </aside>
    </>
  );
};
