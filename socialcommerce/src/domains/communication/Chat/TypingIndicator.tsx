import React from 'react';
import { useConversationStore } from '../stores/conversationStore';

interface TypingIndicatorProps {
  conversationId: string;
  participantNames: Record<string, string>; // userId → displayName
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  conversationId,
  participantNames,
}) => {
  const typingUsers = useConversationStore((s) => s.typingUsers[conversationId]);

  if (!typingUsers || typingUsers.size === 0) return null;

  const names = Array.from(typingUsers)
    .map((id) => participantNames[id] ?? 'Someone')
    .slice(0, 3);

  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : `${names[0]}, ${names[1]}, and others are typing…`;

  return (
    <div
      aria-live="polite"
      aria-label={label}
      style={{
        padding: '4px 16px',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
      }}
    >
      <TypingDots />
      <span>{label}</span>
    </div>
  );
};

const TypingDots: React.FC = () => (
  <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--color-text-muted)',
          display: 'inline-block',
          animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </span>
);
