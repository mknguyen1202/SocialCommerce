import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupSearch, useJoinGroup } from '../hooks/useGroups';
import { Button } from '../../../shared/components/Button';
import { Skeleton } from '../../../shared/components/Skeleton';
import { GroupCreateModal } from './GroupCreateModal';

export const GroupDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: groups, isLoading } = useGroupSearch(query || 'a');
  const joinGroup = useJoinGroup();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-6)', height: '100%', overflowY: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
          }}
        >
          Discover Communities
        </h1>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          + Create Community
        </Button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search communities…"
        aria-label="Search communities"
        style={{
          width: '100%',
          background: 'var(--color-surface-3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-base)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-5)',
          boxSizing: 'border-box',
        }}
      />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={80} />
          ))}
        </div>
      ) : !groups?.length ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-12)' }}>
          No communities found for "{query}".
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {groups.map((group) => (
            <div
              key={group.id}
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                alignItems: 'center',
                background: 'var(--color-surface-3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border-default)',
              }}
            >
              {group.avatarUrl ? (
                <img
                  src={group.avatarUrl}
                  alt={group.name}
                  loading="lazy"
                  decoding="async"
                  width={48}
                  height={48}
                  style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {group.name[0]?.toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => navigate(`/social/group/${group.slug}`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'block',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    g/{group.slug}
                  </span>
                </button>
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
                  {group.memberCount.toLocaleString()} members
                  {group.description && ` · ${group.description}`}
                </p>
              </div>
              <Button
                variant={group.userRole ? 'ghost' : 'primary'}
                size="sm"
                onClick={() => !group.userRole && joinGroup.mutate(group.slug)}
                disabled={!!group.userRole}
              >
                {group.userRole ? 'Joined' : 'Join'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <GroupCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
