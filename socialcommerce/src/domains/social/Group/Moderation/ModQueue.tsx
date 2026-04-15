import React from 'react';
import { useParams } from 'react-router-dom';
import { useModQueue, useModAction } from '../../hooks/useGroups';
import { Button } from '../../../../shared/components/Button';
import { Skeleton } from '../../../../shared/components/Skeleton';
import { TimeAgo } from '../../shared/TimeAgo';

export const ModQueue: React.FC = () => {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { data: items, isLoading } = useModQueue(groupSlug ?? '');
  const modAction = useModAction();

  if (!groupSlug) return null;

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
        Mod Queue
      </h2>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={100} />
          ))}
        </div>
      ) : !items?.length ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-10)' }}>
          ✅ Queue is empty
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--color-surface-3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border-default)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        background:
                          item.type === 'post'
                            ? 'rgba(88,101,242,0.2)'
                            : 'rgba(240,178,50,0.2)',
                        color:
                          item.type === 'post' ? 'var(--color-brand-primary)' : 'var(--color-warning)',
                        fontSize: 'var(--font-size-xs)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.type}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      by {item.authorName}
                    </span>
                    <TimeAgo date={item.createdAt} />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.content}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      modAction.mutate({ slug: groupSlug, itemId: item.id, action: 'approve' })
                    }
                    isLoading={modAction.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      modAction.mutate({ slug: groupSlug, itemId: item.id, action: 'remove' })
                    }
                    isLoading={modAction.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
