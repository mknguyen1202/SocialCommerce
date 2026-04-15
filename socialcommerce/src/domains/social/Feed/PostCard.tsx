import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../../../shared/types/domain';
import { Avatar } from '../../../shared/components/Avatar';
import { PostVoteControls } from './PostVoteControls';
import { PostActions } from './PostActions';
import { TimeAgo } from '../shared/TimeAgo';
import { useVotePost, useSavePost } from '../hooks/usePost';
import { useAuthContext } from '../../../app/providers/AuthProvider';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = React.memo(({ post }) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const votePost = useVotePost();
  const savePost = useSavePost();

  const isAuthor = user?.id === post.author.id;

  const goToPost = useCallback(() => navigate(`/social/post/${post.id}`), [navigate, post.id]);
  const goToGroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.group) navigate(`/social/group/${post.group.slug}`);
  }, [navigate, post.group]);
  const goToAuthor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/social/wall/${post.author.id}`);
  }, [navigate, post.author.id]);

  return (
    <article
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        cursor: 'pointer',
        border: '1px solid var(--color-border-default)',
        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-emphasis)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-default)'; }}
      onClick={goToPost}
      aria-label={`Post: ${post.title}`}
    >
      {/* Vote column */}
      <div onClick={(e) => e.stopPropagation()}>
        <PostVoteControls
          score={post.score}
          userVote={post.userVote}
          onVote={(dir) => votePost.mutate({ postId: post.id, direction: dir })}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
            flexWrap: 'wrap',
          }}
        >
          {post.group && (
            <button
              onClick={goToGroup}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                padding: 0,
              }}
            >
              g/{post.group.slug}
            </button>
          )}
          <button
            onClick={goToAuthor}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Avatar
              src={post.author.avatarUrl}
              alt={post.author.displayName}
              size="xs"
            />
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {post.author.displayName}
            </span>
          </button>
          <TimeAgo date={post.createdAt} />
          {post.editedAt && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              (edited)
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            margin: 0,
            marginBottom: 'var(--space-2)',
            lineHeight: 'var(--line-height-tight)',
          }}
        >
          {post.title}
        </h3>

        {/* Body preview */}
        {post.body && (
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              margin: 0,
              marginBottom: 'var(--space-2)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              lineHeight: 'var(--line-height-base)',
            }}
          >
            {post.body}
          </p>
        )}

        {/* Image preview */}
        {post.type === 'image' && post.mediaUrls[0] && (
          <img
            src={post.mediaUrls[0]}
            alt="Post media"
            loading="lazy"
            decoding="async"
            width={600}
            height={300}
            style={{
              maxHeight: 300,
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-2)',
            }}
          />
        )}

        {/* Link preview */}
        {post.type === 'link' && post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-link)',
              marginBottom: 'var(--space-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            🔗 {post.linkUrl}
          </a>
        )}

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <PostActions
            post={post}
            isAuthor={isAuthor}
            onComment={goToPost}
            onShare={() => navigator.clipboard.writeText(`/social/post/${post.id}`)}
            onSave={(save) => savePost.mutate({ postId: post.id, save })}
            onReport={() => { }}
            onEdit={isAuthor ? goToPost : undefined}
            onDelete={isAuthor ? () => { } : undefined}
          />
        </div>
      </div>
    </article>
  );
});
