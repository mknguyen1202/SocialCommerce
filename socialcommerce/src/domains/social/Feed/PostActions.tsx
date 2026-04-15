import React from 'react';
import type { Post } from '../../../shared/types/domain';

interface PostActionsProps {
  post: Post;
  isAuthor?: boolean;
  onComment: () => void;
  onShare: () => void;
  onSave: (save: boolean) => void;
  onReport: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const actionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-secondary)',
  transition: 'background var(--transition-fast), color var(--transition-fast)',
};

export const PostActions: React.FC<PostActionsProps> = React.memo(({
  post,
  isAuthor,
  onComment,
  onShare,
  onSave,
  onReport,
  onEdit,
  onDelete,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
    <button onClick={onComment} style={actionBtn} aria-label="Comment">
      <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
      {post.commentCount > 0 && post.commentCount}
    </button>

    <button onClick={onShare} style={actionBtn} aria-label="Share">
      <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
      </svg>
      Share
    </button>

    <button
      onClick={() => onSave(!post.isSaved)}
      style={{
        ...actionBtn,
        color: post.isSaved ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
      }}
      aria-label={post.isSaved ? 'Unsave' : 'Save'}
      aria-pressed={post.isSaved}
    >
      <svg
        width={13}
        height={13}
        viewBox="0 0 24 24"
        fill={post.isSaved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
      </svg>
      {post.isSaved ? 'Saved' : 'Save'}
    </button>

    {isAuthor ? (
      <>
        {onEdit && (
          <button onClick={onEdit} style={actionBtn} aria-label="Edit">
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ ...actionBtn, color: 'var(--color-danger)' }}
            aria-label="Delete"
          >
            Delete
          </button>
        )}
      </>
    ) : (
      <button onClick={onReport} style={actionBtn} aria-label="Report">
        Report
      </button>
    )}
  </div>
));
