import React, { useState } from 'react';
import type { ProductImage } from '../../../shared/types/domain';

interface ImageGalleryProps {
  images: ProductImage[];
  title: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title: _title }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div style={{
        aspectRatio: '1 / 1',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, color: 'var(--color-text-muted)',
      }}>
        🖼️
      </div>
    );
  }

  const active = images[activeIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Main image */}
      <div style={{
        aspectRatio: '1 / 1',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--color-surface-2)',
        position: 'relative',
      }}>
        <img
          src={active.url}
          alt={active.alt}
          decoding="async"
          width={600}
          height={600}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous image"
              style={arrowBtn('left')}
            >
              ‹
            </button>
            <button
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
              aria-label="Next image"
              style={arrowBtn('right')}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === activeIndex}
              style={{
                width: 60, height: 60,
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: i === activeIndex
                  ? '2px solid var(--color-brand-primary)'
                  : '2px solid transparent',
                padding: 0, cursor: 'pointer', background: 'none',
                flexShrink: 0,
              }}
            >
              <img src={img.url} alt={img.alt} decoding="async" width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function arrowBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 8,
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.5)',
    border: 'none',
    borderRadius: '50%',
    width: 32, height: 32,
    color: '#fff',
    fontSize: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    lineHeight: 1,
  };
}
