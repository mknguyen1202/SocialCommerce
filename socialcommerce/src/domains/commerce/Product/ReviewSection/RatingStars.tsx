import React from 'react';

interface RatingStarsProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
}

const SIZES = { sm: 14, md: 18, lg: 24 };

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
}) => {
  const [hovered, setHovered] = React.useState(0);
  const px = SIZES[size];

  return (
    <span
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rating' : `${rating} out of ${max} stars`}
      style={{ display: 'inline-flex', gap: 2 }}
    >
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1;
        const filled = interactive ? value <= (hovered || rating) : value <= Math.round(rating);
        return (
          <span
            key={i}
            role={interactive ? 'radio' : undefined}
            aria-checked={interactive ? value === rating : undefined}
            aria-label={interactive ? `${value} star${value > 1 ? 's' : ''}` : undefined}
            onClick={interactive ? () => onChange?.(value) : undefined}
            onMouseEnter={interactive ? () => setHovered(value) : undefined}
            onMouseLeave={interactive ? () => setHovered(0) : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onChange?.(value); } : undefined}
            style={{
              fontSize: px,
              color: filled ? '#f5c518' : 'rgba(255,255,255,0.2)',
              cursor: interactive ? 'pointer' : 'default',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
};
