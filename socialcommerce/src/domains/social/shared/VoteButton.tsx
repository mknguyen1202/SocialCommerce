import React from 'react';
import type { VoteDirection } from '../../../shared/types/domain';

interface VoteButtonProps {
  score: number;
  userVote?: VoteDirection | null;
  onVote: (direction: VoteDirection | null) => void;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md';
}

export const VoteButton: React.FC<VoteButtonProps> = ({
  score,
  userVote,
  onVote,
  orientation = 'vertical',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 14 : 16;

  const btnStyle = (active: boolean, activeColor: string): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 'var(--radius-sm)',
    color: active ? activeColor : 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color var(--transition-fast)',
    flexShrink: 0,
  });

  const scoreStyle: React.CSSProperties = {
    fontSize: size === 'sm' ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
    color:
      userVote === 'up'
        ? 'var(--color-brand-primary)'
        : userVote === 'down'
        ? 'var(--color-danger)'
        : 'var(--color-text-primary)',
    minWidth: size === 'sm' ? 20 : 28,
    textAlign: 'center',
    lineHeight: 1,
  };

  const handleUpvote = () => onVote(userVote === 'up' ? null : 'up');
  const handleDownvote = () => onVote(userVote === 'down' ? null : 'down');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
        gap: 2,
        userSelect: 'none',
      }}
    >
      <button
        onClick={handleUpvote}
        aria-label="Upvote"
        aria-pressed={userVote === 'up'}
        style={btnStyle(userVote === 'up', 'var(--color-brand-primary)')}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4L3 15h6v5h6v-5h6z" />
        </svg>
      </button>
      <span style={scoreStyle}>{score}</span>
      <button
        onClick={handleDownvote}
        aria-label="Downvote"
        aria-pressed={userVote === 'down'}
        style={btnStyle(userVote === 'down', 'var(--color-danger)')}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20l9-11h-6V4H9v5H3z" />
        </svg>
      </button>
    </div>
  );
};
