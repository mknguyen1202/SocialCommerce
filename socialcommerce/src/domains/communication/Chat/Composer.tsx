import React, { useState, useRef, useCallback } from 'react';
import type { DomainMessage } from '../../../shared/types/domain';
import { useTypingEmitter } from '../hooks/useTypingIndicator';
import { Icon } from '../../../shared/components/Icon';
import { X, CornerUpLeft } from '../../../shared/components/iconRegistry';

interface ComposerProps {
  conversationId: string;
  replyTo: DomainMessage | null;
  onCancelReply: () => void;
  onSend: (content: string, replyToId?: string) => void;
  isSending?: boolean;
  placeholder?: string;
}

export const Composer: React.FC<ComposerProps> = ({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
  isSending = false,
  placeholder = 'Send a message…',
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { startTyping, stopTyping } = useTypingEmitter(conversationId);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    autoResize(e.target);
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed, replyTo?.id);
    setContent('');
    stopTyping();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, isSending, onSend, replyTo?.id, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // File upload handled by parent in a real implementation
    console.info('[Composer] files selected:', files.map((f) => f.name));
    e.target.value = '';
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-surface-0)',
        padding: '8px 16px 12px',
        background: 'var(--color-surface-2)',
      }}
    >
      {/* Reply-to banner */}
      {replyTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            marginBottom: 6,
            background: 'color-mix(in srgb, var(--color-brand-primary) 10%, var(--color-surface-3))',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--color-brand-primary)',
          }}
        >
          <Icon icon={CornerUpLeft} size={14} color="var(--color-brand-primary)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-primary)', marginBottom: 1 }}>
              {replyTo.sender.displayName}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 && '…'}
            </div>
          </div>
          <button
            aria-label="Cancel reply"
            onClick={onCancelReply}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 2,
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
            }}
          >
            <Icon icon={X} size={15} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'var(--color-surface-3)',
          borderRadius: 'var(--radius-lg)',
          padding: '6px 8px',
        }}
      >
        {/* Attachment button */}
        <label
          aria-label="Attach file"
          style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 20, flexShrink: 0, lineHeight: 1, padding: '4px 2px' }}
        >
          <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
          📎
        </label>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          aria-label="Message input"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 160,
            padding: '4px 0',
            overflowY: 'auto',
          }}
        />

        {/* Emoji button (placeholder) */}
        <button
          aria-label="Pick emoji"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-secondary)', flexShrink: 0, padding: '4px 2px', lineHeight: 1 }}
        >
          😊
        </button>

        {/* Send button */}
        <button
          aria-label="Send message"
          onClick={handleSubmit}
          disabled={!content.trim() || isSending}
          style={{
            background: content.trim() ? 'var(--color-brand-primary)' : 'var(--color-surface-2)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: content.trim() ? '#fff' : 'var(--color-text-muted)',
            cursor: content.trim() && !isSending ? 'pointer' : 'not-allowed',
            padding: '6px 10px',
            fontSize: 16,
            transition: 'background var(--transition-fast)',
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {isSending ? '⏳' : '➤'}
        </button>
      </div>

      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4, textAlign: 'right' }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
};
