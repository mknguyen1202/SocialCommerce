import React, { useState } from 'react';
import { useSubmitReview } from '../../hooks/useProducts';
import { RatingStars } from './RatingStars';
import { Button } from '../../../../shared/components/Button';

interface ReviewFormProps {
  productId: string;
  onSubmitted: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const submitReview = useSubmitReview(productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!body.trim()) { setError('Review body is required.'); return; }
    try {
      await submitReview.mutateAsync({ rating, title, body });
      onSubmitted();
    } catch {
      setError('Failed to submit review. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div>
        <label style={labelStyle}>Your Rating *</label>
        <RatingStars rating={rating} interactive onChange={setRating} size="lg" />
      </div>

      <div>
        <label htmlFor="review-title" style={labelStyle}>Title</label>
        <input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
          style={fieldStyle}
        />
      </div>

      <div>
        <label htmlFor="review-body" style={labelStyle}>Review *</label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell others what you think…"
          rows={4}
          maxLength={2000}
          style={{ ...fieldStyle, resize: 'vertical', height: 100 }}
        />
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      <Button type="submit" isLoading={submitReview.isPending} style={{ alignSelf: 'flex-start' }}>
        Submit Review
      </Button>
    </form>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-2)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)',
  padding: 'var(--space-2) var(--space-3)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
