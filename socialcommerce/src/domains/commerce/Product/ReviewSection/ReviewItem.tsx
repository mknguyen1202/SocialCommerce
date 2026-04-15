import React from 'react';
import type { ProductReview } from '../../../../shared/types/domain';
import { Avatar } from '../../../../shared/components/Avatar';
import { RatingStars } from './RatingStars';
import { useMarkReviewHelpful } from '../../hooks/useProducts';
import { TimeAgo } from '../../../social/shared/TimeAgo';

interface ReviewItemProps {
  review: ProductReview;
}

export const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  const markHelpful = useMarkReviewHelpful();

  return (
    <article style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      padding: 'var(--space-4)',
      background: 'var(--color-surface-3)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border-default)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Avatar src={review.author.avatarUrl} name={review.author.displayName} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            {review.author.displayName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <RatingStars rating={review.rating} size="sm" />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}><TimeAgo date={review.createdAt} /></span>
          </div>
        </div>
      </div>

      {/* Content */}
      {review.title && (
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
          {review.title}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {review.body}
      </p>

      {/* Images */}
      {review.images.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {review.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Review photo ${i + 1}`}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            />
          ))}
        </div>
      )}

      {/* Helpful */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          Helpful?
        </span>
        <button
          onClick={() => markHelpful.mutate({ productId: review.productId, reviewId: review.id })}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer', fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
          }}
        >
          👍 {review.helpfulCount}
        </button>
      </div>
    </article>
  );
};
