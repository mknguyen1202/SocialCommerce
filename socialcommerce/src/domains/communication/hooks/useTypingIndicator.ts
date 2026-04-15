import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChannel, useSocket } from '../../../shared/realtime/useSocket';
import { useConversationStore } from '../stores/conversationStore';
import { messagesKey } from './useMessages';
import type { DomainMessage, Paginated } from '../../../shared/types/domain';
import type { InfiniteData } from '@tanstack/react-query';

const TYPING_DEBOUNCE_MS = 2_000;

/**
 * Sends typing:start / typing:stop events to the server,
 * debounced so we don't flood the WebSocket.
 */
export function useTypingEmitter(conversationId: string) {
  const { send } = useSocket('conversation');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const startTyping = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      send('typing:start', { conversationId });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      send('typing:stop', { conversationId });
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId, send]);

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      send('typing:stop', { conversationId });
    }
  }, [conversationId, send]);

  // Cleanup on unmount
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  return { startTyping, stopTyping };
}

/**
 * Subscribes to real-time typing events for a conversation.
 * Updates the conversationStore's typingUsers map.
 */
export function useTypingIndicatorSubscription(conversationId: string) {
  const setTyping = useConversationStore((s) => s.setTyping);

  const handleTypingStart = useCallback(
    (payload: unknown) => {
      const p = payload as { conversationId: string; userId: string };
      if (p.conversationId === conversationId) setTyping(conversationId, p.userId, true);
    },
    [conversationId, setTyping]
  );

  const handleTypingStop = useCallback(
    (payload: unknown) => {
      const p = payload as { conversationId: string; userId: string };
      if (p.conversationId === conversationId) setTyping(conversationId, p.userId, false);
    },
    [conversationId, setTyping]
  );

  useChannel('conversation', 'typing:start', handleTypingStart);
  useChannel('conversation', 'typing:stop', handleTypingStop);
}

/**
 * Subscribes to real-time message events and syncs them into the
 * TanStack Query message cache.
 */
export function useMessageSubscription(conversationId: string) {
  const qc = useQueryClient();

  const handleNewMessage = useCallback(
    (payload: unknown) => {
      const message = payload as DomainMessage;
      if (message.conversationId !== conversationId) return;

      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = [...old.pages];
          const lastPage = pages[pages.length - 1];
          // Avoid duplicates (may have been added optimistically)
          if (lastPage.items.some((m) => m.id === message.id)) return old;
          pages[pages.length - 1] = {
            ...lastPage,
            items: [...lastPage.items, message],
          };
          return { ...old, pages };
        }
      );
    },
    [conversationId, qc]
  );

  const handleEditMessage = useCallback(
    (payload: unknown) => {
      const p = payload as { messageId: string; content: string; editedAt: string };
      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            items: page.items.map((m) =>
              m.id === p.messageId
                ? { ...m, content: p.content, editedAt: new Date(p.editedAt) }
                : m
            ),
          }));
          return { ...old, pages };
        }
      );
    },
    [conversationId, qc]
  );

  const handleDeleteMessage = useCallback(
    (payload: unknown) => {
      const p = payload as { messageId: string };
      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            items: page.items.filter((m) => m.id !== p.messageId),
          }));
          return { ...old, pages };
        }
      );
    },
    [conversationId, qc]
  );

  useChannel('conversation', 'message:new', handleNewMessage);
  useChannel('conversation', 'message:edit', handleEditMessage);
  useChannel('conversation', 'message:delete', handleDeleteMessage);
}
