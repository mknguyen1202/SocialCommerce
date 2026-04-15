import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import type { DomainMessage, Paginated } from '../../../shared/types/domain';
import { useAuthContext } from '../../../app/providers/AuthProvider';
import { useConversationStore } from '../stores/conversationStore';

interface MessageDTO {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_display_name: string;
  sender_avatar_url: string;
  sender_username: string;
  content: string;
  status: string;
  created_at: string;
  edited_at?: string;
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_sender_name?: string;
  attachments: Array<{
    id: string;
    type: string;
    url: string;
    filename: string;
    size: number;
    mime_type: string;
    thumbnail_url?: string;
  }>;
  reactions: Array<{
    emoji: string;
    user_ids: string[];
    count: number;
  }>;
}

interface MessagesPageDTO {
  data: MessageDTO[];
  next_cursor: string | null;
  has_more: boolean;
}

function mapMessage(dto: MessageDTO): DomainMessage {
  return {
    id: dto.id,
    conversationId: dto.conversation_id,
    sender: {
      id: dto.sender_id,
      username: dto.sender_username,
      displayName: dto.sender_display_name,
      avatarUrl: dto.sender_avatar_url,
      presence: 'offline',
      lastSeen: new Date(),
    },
    content: dto.content,
    status: dto.status as DomainMessage['status'],
    createdAt: new Date(dto.created_at),
    editedAt: dto.edited_at ? new Date(dto.edited_at) : undefined,
    attachments: dto.attachments.map((a) => ({
      id: a.id,
      type: a.type as DomainMessage['attachments'][0]['type'],
      url: a.url,
      filename: a.filename,
      size: a.size,
      mimeType: a.mime_type,
      thumbnailUrl: a.thumbnail_url,
    })),
    reactions: dto.reactions.map((r) => ({
      emoji: r.emoji,
      userIds: r.user_ids,
      count: r.count,
    })),
    replyTo: dto.reply_to_id
      ? {
          id: dto.reply_to_id,
          content: dto.reply_to_content ?? '',
          sender: {
            id: '',
            username: '',
            displayName: dto.reply_to_sender_name ?? '',
            avatarUrl: '',
            presence: 'offline',
            lastSeen: new Date(),
          },
        }
      : undefined,
  };
}

export function messagesKey(conversationId: string) {
  return ['messages', conversationId] as const;
}

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery<Paginated<DomainMessage>, Error>({
    queryKey: conversationId ? messagesKey(conversationId) : ['messages', '__none__'],
    enabled: !!conversationId,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam ? `?cursor=${pageParam}` : '';
      const dto = await apiGet<MessagesPageDTO>(`/conversations/${conversationId}/messages${cursor}`);
      return {
        items: dto.data.map(mapMessage),
        nextCursor: dto.next_cursor,
        hasMore: dto.has_more,
      };
    },
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  const { addPendingMessage, removePendingMessage } = useConversationStore();

  return useMutation({
    mutationFn: (payload: { content: string; replyToId?: string; attachmentIds?: string[] }) =>
      apiPost<MessageDTO>(`/conversations/${conversationId}/messages`, payload),

    onMutate: async (payload) => {
      const tempId = `temp-${Date.now()}`;
      addPendingMessage(conversationId, tempId);

      await qc.cancelQueries({ queryKey: messagesKey(conversationId) });
      const previous = qc.getQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId)
      );

      const optimisticMessage: DomainMessage = {
        id: tempId,
        conversationId,
        sender: {
          id: user?.id ?? '',
          username: '',
          displayName: user?.name ?? user?.email ?? 'Me',
          avatarUrl: '',
          presence: 'online',
          lastSeen: new Date(),
        },
        content: payload.content,
        attachments: [],
        reactions: [],
        status: 'sending',
        createdAt: new Date(),
      };

      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = [...old.pages];
          const lastPage = pages[pages.length - 1];
          pages[pages.length - 1] = {
            ...lastPage,
            items: [...lastPage.items, optimisticMessage],
          };
          return { ...old, pages };
        }
      );

      return { tempId, previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(messagesKey(conversationId), ctx.previous);
      }
      if (ctx?.tempId) removePendingMessage(conversationId, ctx.tempId);
    },

    onSuccess: (data, _vars, ctx) => {
      if (ctx?.tempId) removePendingMessage(conversationId, ctx.tempId);

      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            items: page.items.map((m) =>
              m.id === ctx.tempId ? mapMessage(data) : m
            ),
          }));
          return { ...old, pages };
        }
      );
    },
  });
}

export function useEditMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      apiPatch<MessageDTO>(`/conversations/${conversationId}/messages/${messageId}`, { content }),
    onSuccess: (data) => {
      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            items: page.items.map((m) => (m.id === data.id ? mapMessage(data) : m)),
          }));
          return { ...old, pages };
        }
      );
    },
  });
}

export function useDeleteMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiDelete(`/conversations/${conversationId}/messages/${messageId}`),
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: messagesKey(conversationId) });
      qc.setQueryData<InfiniteData<Paginated<DomainMessage>>>(
        messagesKey(conversationId),
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            items: page.items.filter((m) => m.id !== messageId),
          }));
          return { ...old, pages };
        }
      );
    },
  });
}

export function useToggleReaction(conversationId: string) {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiPost(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji }),
  });
}
