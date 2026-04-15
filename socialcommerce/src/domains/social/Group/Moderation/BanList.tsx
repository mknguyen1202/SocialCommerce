import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGroupBans, useUnbanUser, useBanUser } from '../../hooks/useGroups';
import { Button } from '../../../../shared/components/Button';
import { Skeleton } from '../../../../shared/components/Skeleton';
import { TimeAgo } from '../../shared/TimeAgo';

export const BanList: React.FC = () => {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { data: bans, isLoading } = useGroupBans(groupSlug ?? '');
  const unbanUser = useUnbanUser();
  const banUser = useBanUser();

  const [newUserId, setNewUserId] = useState('');
  const [newReason, setNewReason] = useState('');

  if (!groupSlug) return null;

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h2
        style={{
          margin: 0,
          marginBottom: 'var(--space-5)',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
        }}
      >
        Banned Users
      </h2>

      {/* Ban a user */}
      <div
        style={{
          background: 'var(--color-surface-3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            User ID
          </label>
          <input
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="user-id or username"
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: '2 1 240px' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Reason
          </label>
          <input
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Rule violation, spam, etc."
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (!newUserId.trim()) return;
            banUser.mutate({ slug: groupSlug, userId: newUserId.trim(), reason: newReason.trim() });
            setNewUserId('');
            setNewReason('');
          }}
          isLoading={banUser.isPending}
          disabled={!newUserId.trim()}
        >
          Ban User
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={72} />
          ))}
        </div>
      ) : !bans?.length ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-10)' }}>
          No banned users.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {bans.map((ban) => (
            <div
              key={ban.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-surface-3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                gap: 'var(--space-4)',
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {ban.username}
                </span>
                {ban.reason && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                    — {ban.reason}
                  </span>
                )}
                <div style={{ marginTop: 2 }}>
                  <TimeAgo date={ban.bannedAt} />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unbanUser.mutate({ slug: groupSlug, userId: ban.userId })}
                isLoading={unbanUser.isPending}
              >
                Unban
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
