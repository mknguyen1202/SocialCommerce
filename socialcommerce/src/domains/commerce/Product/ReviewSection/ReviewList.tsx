import React, { useState } from 'react';
import { useProductReviews } from '../../hooks/useProducts';
import { ReviewItem } from './ReviewItem';
import { ReviewSort } from './ReviewSort';
import { ReviewForm } from './ReviewForm';
import { RatingStars } from './RatingStars';
import { Button } from '../../../../shared/components/Button';
import { Skeleton } from '../../../../shared/components/Skeleton';
import type { ReviewSortOption } from './ReviewSort';

interface ReviewListProps {
  productId: string;
  averageRating: number;
  reviewCount: number;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  productId,
  averageRating,
  reviewCount,
}) => {
  const [sort, setSort] = useState<ReviewSortOption>('most_helpful');
  const [showForm, setShowForm] = useState(false);

  const { data: reviews, isLoading } = useProductReviews(productId);

  return (
    <section aria-label="Customer reviews" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
          <span style={{ fontSize: 48, fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {averageRating.toFixed(1)}
          </span>
          <RatingStars rating={averageRating} size="md" />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {reviewCount} review{reviewCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <ReviewSort value={sort} onChange={setSort} />
          <Button variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '✍️ Write a Review'}
          </Button>
        </div>
      </div>

      {/* Write review form */}
      {showForm && (
        <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
            Write a Review
          </h3>
          <ReviewForm productId={productId} onSubmitted={() => setShowForm(false)} />
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 140, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {reviews.map((r) => <ReviewItem key={r.id} review={r} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
          <p style={{ margin: 0 }}>No reviews yet. Be the first to review this product.</p>
        </div>
      )}
    </section>
  );
};
