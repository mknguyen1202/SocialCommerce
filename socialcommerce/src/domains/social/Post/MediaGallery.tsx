import React, { useState } from 'react';

interface MediaGalleryProps {
  urls: string[];
  alt?: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ urls, alt = 'Post media' }) => {
  const [active, setActive] = useState(0);

  if (urls.length === 0) return null;

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: 'var(--color-surface-0)',
          maxHeight: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          key={urls[active]}
          src={urls[active]}
          alt={`${alt} ${active + 1}`}
          loading="lazy"
          decoding="async"
          width={800}
          height={480}
          style={{ maxWidth: '100%', maxHeight: 480, width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
        />
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
              aria-label="Previous image"
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                width: 32,
                height: 32,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: active === 0 ? 0.3 : 1,
              }}
            >
              ‹
            </button>
            <button
              onClick={() => setActive((a) => Math.min(urls.length - 1, a + 1))}
              disabled={active === urls.length - 1}
              aria-label="Next image"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                width: 32,
                height: 32,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: active === urls.length - 1 ? 0.3 : 1,
              }}
            >
              ›
            </button>
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                right: 12,
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                fontSize: 'var(--font-size-xs)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {active + 1}/{urls.length}
            </span>
          </>
        )}
      </div>

      {urls.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-1)',
            marginTop: 'var(--space-2)',
            overflowX: 'auto',
          }}
        >
          {urls.map((url, i) => (
            <button
              key={url}
              onClick={() => setActive(i)}
              aria-label={`Image ${i + 1}`}
              style={{
                padding: 0,
                border: `2px solid ${i === active ? 'var(--color-brand-primary)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${i + 1}`}
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
                style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
