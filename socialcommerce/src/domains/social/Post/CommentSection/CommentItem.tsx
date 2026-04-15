import React, { useState } from 'react';
import type { Comment } from '../../../../shared/types/domain';
import { Avatar } from '../../../../shared/components/Avatar';
import { VoteButton } from '../../shared/VoteButton';
import { TimeAgo } from '../../shared/TimeAgo';
import { CommentComposer } from './CommentComposer';
import { useVoteComment, useCreateComment, useEditComment, useDeleteComment } from '../../hooks/useComments';
import { useAuthContext } from '../../../../app/providers/AuthProvider';

interface CommentItemProps {
  comment: Comment;
  depth?: number;
}

const MAX_DEPTH = 6;

export const CommentItem: React.FC<CommentItemProps> = React.memo(({ comment, depth = 0 }) => {
  const { user } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(comment.isCollapsed);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);

  const voteComment = useVoteComment();
  const createComment = useCreateComment();
  const editComment = useEditComment();
  const deleteComment = useDeleteComment();

  const isAuthor = user?.id === comment.author.id;
  const indentColor = `hsl(${(depth * 47) % 360}, 60%, 50%)`;

  const actionStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    transition: 'color var(--transition-fast)',
  };

  return (
    <div
      style={{
        paddingLeft: depth > 0 ? 'var(--space-4)' : 0,
        borderLeft: depth > 0 ? `2px solid ${indentColor}22` : 'none',
        marginLeft: depth > 0 ? 'var(--space-3)' : 0,
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? 'Expand thread' : 'Collapse thread'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: '2px 4px',
            fontSize: 'var(--font-size-xs)',
            marginTop: 2,
            flexShrink: 0,
          }}
        >
          {isCollapsed ? '[+]' : '[–]'}
        </button>

        <Avatar src={comment.author.avatarUrl} alt={comment.author.displayName} size="sm" />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Author + meta */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              marginBottom: 'var(--space-1)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
              }}
            >
              {comment.author.displayName}
            </span>
            <TimeAgo date={comment.createdAt} />
            {comment.editedAt && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                (edited)
              </span>
            )}
          </div>

          {!isCollapsed && (
            <>
              {/* Body / inline edit */}
              {isEditing ? (
                <div>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--font-size-sm)',
                      padding: 'var(--space-2)',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}
                  >
                    <button
                      onClick={() => {
                        editComment.mutate({
                          commentId: comment.id,
                          postId: comment.postId,
                          body: editBody.trim(),
                        });
                        setIsEditing(false);
                      }}
                      style={{ ...actionStyle, color: 'var(--color-brand-primary)' }}
                    >
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} style={actionStyle}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 'var(--line-height-base)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {comment.body}
                </p>
              )}

              {/* Vote + actions row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <VoteButton
                  score={comment.score}
                  userVote={comment.userVote}
                  onVote={(dir) =>
                    voteComment.mutate({
                      commentId: comment.id,
                      postId: comment.postId,
                      direction: dir,
                    })
                  }
                  orientation="horizontal"
                  size="sm"
                />
                <button
                  onClick={() => setIsReplying((r) => !r)}
                  style={actionStyle}
                  aria-expanded={isReplying}
                >
                  Reply
                </button>
                {isAuthor && (
                  <>
                    <button onClick={() => setIsEditing(true)} style={actionStyle}>
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        deleteComment.mutate({ commentId: comment.id, postId: comment.postId })
                      }
                      style={{ ...actionStyle, color: 'var(--color-danger)' }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* Reply composer */}
              {isReplying && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <CommentComposer
                    postId={comment.postId}
                    parentId={comment.id}
                    replyToName={comment.author.displayName}
                    autoFocus
                    onSubmit={async (body) => {
                      await createComment.mutateAsync({
                        postId: comment.postId,
                        parentId: comment.id,
                        body,
                      });
                      setIsReplying(false);
                    }}
                    onCancel={() => setIsReplying(false)}
                  />
                </div>
              )}

              {/* Nested replies */}
              {comment.replies.length > 0 && depth < MAX_DEPTH && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                  ))}
                </div>
              )}
              {comment.replies.length > 0 && depth >= MAX_DEPTH && (
                <button style={{ ...actionStyle, marginTop: 'var(--space-2)' }}>
                  Continue thread →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
