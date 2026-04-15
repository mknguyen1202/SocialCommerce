import React, { useState, useRef } from 'react';
import { Avatar } from '../../../../shared/components/Avatar';
import { Button } from '../../../../shared/components/Button';
import { useAuthContext } from '../../../../app/providers/AuthProvider';

interface CommentComposerProps {
  postId: string;
  parentId?: string;
  replyToName?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
  replyToName,
  onSubmit,
  onCancel,
  autoFocus,
}) => {
  const { user } = useAuthContext();
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBody('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
      <Avatar
        src={user?.email ? '' : ''}
        alt={user?.name ?? 'You'}
        size="sm"
      />
      <div style={{ flex: 1 }}>
        {replyToName && (
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Replying to <strong style={{ color: 'var(--color-text-secondary)' }}>{replyToName}</strong>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are your thoughts?"
          autoFocus={autoFocus}
          rows={3}
          aria-label="Write a comment"
          style={{
            width: '100%',
            resize: 'vertical',
            background: 'var(--color-surface-2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            padding: 'var(--space-2) var(--space-3)',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-2)',
          }}
        >
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!body.trim()}
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
};
