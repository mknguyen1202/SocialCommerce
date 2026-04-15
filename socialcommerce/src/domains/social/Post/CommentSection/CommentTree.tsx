import React, { useState } from 'react';
import { useComments } from '../../hooks/useComments';
import type { CommentSort } from '../../hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentComposer } from './CommentComposer';
import { CommentSortControl } from './CommentSort';
import { useCreateComment } from '../../hooks/useComments';
import { Skeleton } from '../../../../shared/components/Skeleton';

interface CommentTreeProps {
  postId: string;
}

export const CommentTree: React.FC<CommentTreeProps> = ({ postId }) => {
  const [sort, setSort] = useState<CommentSort>('best');
  const { data: comments, isLoading } = useComments(postId, sort);
  const createComment = useCreateComment();

  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <h2
        style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Comments {comments ? `(${comments.length})` : ''}
      </h2>

      <div style={{ marginBottom: 'var(--space-5)' }}>
        <CommentComposer
          postId={postId}
          onSubmit={async (body) => {
            await createComment.mutateAsync({ postId, body });
          }}
        />
      </div>

      <CommentSortControl sort={sort} onChange={setSort} />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={80} />
          ))}
        </div>
      ) : comments?.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            padding: 'var(--space-8)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          No comments yet. Start the conversation!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {comments?.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};
