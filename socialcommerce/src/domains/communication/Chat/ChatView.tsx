import React, { useState, useMemo } from 'react';
import { useMessages, useSendMessage } from '../hooks/useMessages';
import {
  useTypingIndicatorSubscription,
  useMessageSubscription,
} from '../hooks/useTypingIndicator';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { TypingIndicator } from './TypingIndicator';
import { Skeleton } from '../../../shared/components/Skeleton';
import type { Conversation, DomainMessage, DomainUser } from '../../../shared/types/domain';

interface ChatViewProps {
  conversation: Conversation;
  currentUser: DomainUser | null;
}

export const ChatView: React.FC<ChatViewProps> = ({ conversation, currentUser }) => {
  const [replyTo, setReplyTo] = useState<DomainMessage | null>(null);

  // Real-time subscriptions
  useMessageSubscription(conversation.id);
  useTypingIndicatorSubscription(conversation.id);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(conversation.id);

  const { mutate: sendMessage, isPending: isSending } = useSendMessage(conversation.id);

  // Flatten all pages into a single ordered list
  const messages = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  // Build a map of userId → displayName for typing indicator
  const participantNames = useMemo(
    () =>
      Object.fromEntries(
        conversation.participants.map((p) => [p.id, p.displayName])
      ),
    [conversation.participants]
  );

  const handleSend = (content: string, replyToId?: string) => {
    sendMessage({ content, replyToId });
    setReplyTo(null);
  };

  if (isLoading) {
    return (
      <div style={{ flex: 1, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Skeleton variant="circle" width={40} height={40} />
            <Skeleton variant="text" lines={i % 3 === 0 ? 3 : 2} style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <MessageList
        messages={messages}
        currentUser={currentUser}
        isFetchingMore={isFetchingNextPage}
        hasMore={!!hasNextPage}
        onLoadMore={fetchNextPage}
        onReply={setReplyTo}
      />

      <TypingIndicator
        conversationId={conversation.id}
        participantNames={participantNames}
      />

      <Composer
        conversationId={conversation.id}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
        isSending={isSending}
      />
    </div>
  );
};
