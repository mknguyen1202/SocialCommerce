import React, { useState } from 'react';
import type { Group } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';
import { useJoinGroup, useLeaveGroup } from '../hooks/useGroups';

interface GroupHeaderProps {
  group: Group;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({ group }) => {
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const [leaving, setLeaving] = useState(false);

  const isMember = !!group.userRole;

  return (
    <div
      style={{
        background: 'var(--color-surface-3)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 'var(--space-4)',
      }}
    >
      {/* Banner */}
      <div
        style={{
          height: 120,
          background: group.bannerUrl
            ? `url(${group.bannerUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
        }}
      />

      <div style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
          {group.avatarUrl ? (
            <img
              src={group.avatarUrl}
              alt={group.name}
              loading="lazy"
              decoding="async"
              width={64}
              height={64}
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-md)',
                border: '3px solid var(--color-surface-3)',
                marginTop: -32,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-md)',
                border: '3px solid var(--color-surface-3)',
                marginTop: -32,
                background: 'var(--color-brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: '#fff',
              }}
            >
              {group.name[0]?.toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
              }}
            >
              {group.name}
            </h1>
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              g/{group.slug} ·{' '}
              {group.memberCount.toLocaleString()} member{group.memberCount !== 1 ? 's' : ''} ·{' '}
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background:
                    group.visibility === 'public'
                      ? 'rgba(35,165,89,0.2)'
                      : 'rgba(240,178,50,0.2)',
                  color:
                    group.visibility === 'public'
                      ? 'var(--color-success)'
                      : 'var(--color-warning)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                {group.visibility}
              </span>
            </p>
          </div>

          {isMember ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!leaving) {
                  setLeaving(true);
                } else {
                  leaveGroup.mutate(group.slug);
                }
              }}
            >
              {leaving ? 'Confirm leave?' : 'Joined'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => joinGroup.mutate(group.slug)}
              isLoading={joinGroup.isPending}
            >
              {group.visibility === 'restricted' ? 'Request to Join' : 'Join'}
            </Button>
          )}
        </div>

        {group.description && (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--line-height-base)',
            }}
          >
            {group.description}
          </p>
        )}
      </div>
    </div>
  );
};
