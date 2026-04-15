import React, { useRef, useEffect, useCallback } from 'react';
import type { Theater } from '../../../../shared/types/domain';
import { useStreamingStore } from '../../stores/streamingStore';
import {
  useTheaterChatSubscription,
  useSendChatMessage,
  useDeleteChatMessage,
} from '../../hooks/useTheaterChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatModTools } from './ChatModTools';
import { useAuthContext } from '../../../../app/providers/AuthProvider';

interface ChatPanelProps {
  theater: Theater;
  canModerate: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ theater, canModerate }) => {
  const { user } = useAuthContext();
  const { chatMessages, clearChat } = useStreamingStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendChatMessage(theater.id);
  const deleteMessage = useDeleteChatMessage(theater.id);

  // Subscribe to real-time chat events
  useTheaterChatSubscription(theater.id);

  // Clear chat on theater change
  useEffect(() => {
    clearChat();
  }, [theater.id, clearChat]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [chatMessages.length]);

  const handleSend = useCallback((content: string) => {
    if (!user) return;
    sendMessage(
      content,
      user.id,
      user.name ?? user.email ?? 'Viewer',
      ''
    );
  }, [user, sendMessage]);

  return (
    <aside
      aria-label="Theater chat"
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-1)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-3)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
          }}
        >
          Live Chat
        </p>
      </div>

      {/* Mod tools (host/moderator only) */}
      {canModerate && <ChatModTools theaterId={theater.id} />}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: 'var(--space-2)',
          paddingBottom: 'var(--space-2)',
        }}
        aria-live="polite"
        aria-label="Chat messages"
      >
        {chatMessages.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: 'var(--space-6)',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            Be the first to say something!
          </p>
        ) : (
          chatMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isHost={msg.sender.id === theater.host.id}
              canModerate={canModerate}
              onDelete={(id) => deleteMessage.mutate(id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={!user} />
    </aside>
  );
};
