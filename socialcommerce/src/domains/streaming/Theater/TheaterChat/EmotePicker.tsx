import React from 'react';

const GLOBAL_EMOTES = ['😄', '😂', '❤️', '🔥', '👏', '😮', '😢', '😡', '🎉', '💯'];

interface EmotePickerProps {
  onSelect: (emote: string) => void;
  onClose: () => void;
}

export const EmotePicker: React.FC<EmotePickerProps> = ({ onSelect, onClose }) => {
  return (
    <div
      role="dialog"
      aria-label="Emote picker"
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: 'var(--space-2)',
        background: 'var(--color-surface-2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 'var(--space-1)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 10,
      }}
    >
      {GLOBAL_EMOTES.map((emote) => (
        <button
          key={emote}
          onClick={() => {
            onSelect(emote);
            onClose();
          }}
          aria-label={emote}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            padding: 4,
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--transition-fast)',
            lineHeight: 1,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'var(--color-surface-3)')
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          {emote}
        </button>
      ))}
    </div>
  );
};
