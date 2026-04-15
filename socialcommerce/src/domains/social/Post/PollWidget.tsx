import React from 'react';
import type { Poll } from '../../../shared/types/domain';
import { apiPost } from '../../../shared/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface PollWidgetProps {
  poll: Poll;
  postId: string;
}

export const PollWidget: React.FC<PollWidgetProps> = ({ poll, postId }) => {
  const queryClient = useQueryClient();
  const hasVoted = !!poll.userVotedOptionId;
  const isExpired = poll.endsAt ? new Date() > poll.endsAt : false;
  const showResults = hasVoted || isExpired;

  const handleVote = async (optionId: string) => {
    if (showResults) return;
    await apiPost(`/api/posts/${postId}/poll/vote`, { option_id: optionId });
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  };

  return (
    <div
      style={{
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {poll.options.map((opt) => {
          const isChosen = poll.userVotedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={showResults}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                border: `1px solid ${isChosen ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                cursor: showResults ? 'default' : 'pointer',
                overflow: 'hidden',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                textAlign: 'left',
                minHeight: 40,
              }}
              aria-pressed={isChosen}
            >
              {showResults && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${opt.percentage}%`,
                    background: isChosen
                      ? 'rgba(88,101,242,0.25)'
                      : 'rgba(255,255,255,0.05)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'width 0.4s ease',
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {isChosen && '✓ '}
                {opt.label}
              </span>
              {showResults && (
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {opt.percentage.toFixed(0)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          display: 'flex',
          gap: 'var(--space-3)',
        }}
      >
        <span>{poll.totalVotes} votes</span>
        {poll.endsAt && (
          <span>
            {isExpired ? 'Ended' : `Ends ${poll.endsAt.toLocaleDateString()}`}
          </span>
        )}
      </div>
    </div>
  );
};
