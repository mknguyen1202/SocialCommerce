import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Group } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';

interface GroupSidebarProps {
  group: Group;
}

export const GroupSidebar: React.FC<GroupSidebarProps> = ({ group }) => {
  const navigate = useNavigate();
  const isMod = group.userRole === 'owner' || group.userRole === 'moderator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* About */}
      <section
        style={{
          background: 'var(--color-surface-3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: 'var(--space-3)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          About Community
        </h3>
        <p
          style={{
            margin: 0,
            marginBottom: 'var(--space-3)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {group.description || 'No description.'}
        </p>
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Created {group.createdAt.toLocaleDateString()}
        </div>
        <Button variant="primary" size="sm" style={{ width: '100%' }}>
          Create Post
        </Button>
      </section>

      {/* Rules */}
      {group.rules.length > 0 && (
        <section
          style={{
            background: 'var(--color-surface-3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Rules
          </h3>
          <ol style={{ margin: 0, paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[...group.rules]
              .sort((a, b) => a.order - b.order)
              .map((rule) => (
                <li key={rule.id}>
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {rule.title}
                  </span>
                  {rule.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {rule.description}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        </section>
      )}

      {/* Mod tools */}
      {isMod && (
        <section
          style={{
            background: 'var(--color-surface-3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-warning)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Mod Tools
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              { label: 'Mod Queue', path: 'mod/queue' },
              { label: 'Banned Users', path: 'mod/bans' },
              { label: 'Edit Rules', path: 'mod/rules' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(`/social/group/${group.slug}/${item.path}`)}
                style={{
                  background: 'var(--color-surface-2)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-2) var(--space-3)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  transition: 'background var(--transition-fast)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
