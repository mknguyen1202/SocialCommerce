import React, { useState, useRef } from 'react';
import { EmotePicker } from './EmotePicker';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [value, setValue] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmoteSelect = (emote: string) => {
    setValue((v) => v + emote);
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
      }}
    >
      {showEmotes && (
        <EmotePicker onSelect={handleEmoteSelect} onClose={() => setShowEmotes(false)} />
      )}

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'center',
          background: 'var(--color-surface-0)',
          borderRadius: 'var(--radius-md)',
          padding: '0 var(--space-2) 0 var(--space-3)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Chat is unavailable' : 'Send a message…'}
          disabled={disabled}
          maxLength={500}
          aria-label="Chat message"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            padding: 'var(--space-2) 0',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <button
          onClick={() => setShowEmotes((s) => !s)}
          aria-label="Emote picker"
          aria-expanded={showEmotes}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            padding: '2px 4px',
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          😄
        </button>

        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          style={{
            background: 'var(--color-brand-primary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            cursor: !value.trim() || disabled ? 'not-allowed' : 'pointer',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            opacity: !value.trim() || disabled ? 0.4 : 1,
            padding: '4px 10px',
            transition: 'opacity var(--transition-fast)',
          }}
        >
          Chat
        </button>
      </div>
    </div>
  );
};
