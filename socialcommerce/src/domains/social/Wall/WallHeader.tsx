import React from 'react';
import type { DomainUser } from '../../../shared/types/domain';
import { Avatar } from '../../../shared/components/Avatar';

interface WallHeaderProps {
  user: DomainUser;
  postCount: number;
  followerCount?: number;
  followingCount?: number;
}

export const WallHeader: React.FC<WallHeaderProps> = ({
  user,
  postCount,
  followerCount,
  followingCount,
}) => (
  <div
    style={{
      background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-6)',
      marginBottom: 'var(--space-6)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-5)',
      border: '1px solid var(--color-border-default)',
    }}
  >
    <Avatar src={user.avatarUrl} alt={user.displayName} size="xl" />
    <div>
      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
          margin: 0,
          marginBottom: 'var(--space-1)',
        }}
      >
        {user.displayName}
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          marginBottom: 'var(--space-3)',
        }}
      >
        u/{user.username}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
        {[
          { label: 'Posts', value: postCount },
          ...(followerCount !== undefined
            ? [{ label: 'Followers', value: followerCount }]
            : []),
          ...(followingCount !== undefined
            ? [{ label: 'Following', value: followingCount }]
            : []),
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              background: 'var(--color-surface-3)',
              border: '1px solid var(--color-border-muted)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              minWidth: 64,
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
              }}
            >
              {value.toLocaleString()}
            </div>
            <div
              style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
