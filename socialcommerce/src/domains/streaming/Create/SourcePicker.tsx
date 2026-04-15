import React from 'react';
import type { ContentSourceType } from '../../../shared/types/domain';

interface SourcePickerProps {
  value: ContentSourceType;
  onChange: (type: ContentSourceType) => void;
  url: string;
  onUrlChange: (url: string) => void;
}

const OPTIONS: { value: ContentSourceType; label: string; icon: string; desc: string }[] = [
  { value: 'screen_share', label: 'Screen Share', icon: '🖥️', desc: 'Share your screen live' },
  { value: 'media_upload', label: 'Upload Media', icon: '📂', desc: 'Upload a video file' },
  { value: 'external_url', label: 'External URL', icon: '🔗', desc: 'Stream from a URL' },
];

export const SourcePicker: React.FC<SourcePickerProps> = ({
  value,
  onChange,
  url,
  onUrlChange,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${value === opt.value ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.08)'}`,
              background: value === opt.value ? 'rgba(var(--color-brand-primary-rgb),0.1)' : 'var(--color-surface-3)',
              cursor: 'pointer',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <span style={{ fontSize: 24 }}>{opt.icon}</span>
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: value === opt.value ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
              }}
            >
              {opt.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>

      {(value === 'external_url' || value === 'media_upload') && (
        <div>
          <label
            htmlFor="source-url"
            style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}
          >
            {value === 'external_url' ? 'Stream URL' : 'Media URL'}
          </label>
          <input
            id="source-url"
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={value === 'external_url' ? 'https://example.com/stream.m3u8' : 'https://example.com/video.mp4'}
            style={{
              width: '100%',
              background: 'var(--color-surface-0)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              padding: 'var(--space-2) var(--space-3)',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  );
};
