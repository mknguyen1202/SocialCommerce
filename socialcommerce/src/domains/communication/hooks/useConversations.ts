import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../../shared/api/client';
import type { Conversation } from '../../../shared/types/domain';

const CONVERSATIONS_KEY = ['conversations'] as const;

interface ConversationDTO {
  id: string;
  type: 'dm' | 'room';
  name?: string;
  avatar_url?: string;
  participant_ids: string[];
  last_message?: {
    id: string;
    content: string;
    sender_display_name: string;
    sender_id: string;
    sender_avatar_url: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
}

function mapConversation(dto: ConversationDTO): Conversation {
  return {
    id: dto.id,
    type: dto.type,
    name: dto.name,
    avatarUrl: dto.avatar_url,
    participants: [],
    lastMessage: dto.last_message
      ? {
          id: dto.last_message.id,
          content: dto.last_message.content,
          sender: {
            id: dto.last_message.sender_id,
            username: '',
            displayName: dto.last_message.sender_display_name,
            avatarUrl: dto.last_message.sender_avatar_url,
            presence: 'offline',
            lastSeen: new Date(),
          },
          createdAt: new Date(dto.last_message.created_at),
        }
      : undefined,
    unreadCount: dto.unread_count,
    pinnedMessages: [],
    createdAt: new Date(dto.created_at),
  };
}

export function useConversations() {
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: async () => {
      const data = await apiGet<ConversationDTO[]>('/conversations');
      return data.map(mapConversation);
    },
    // Stale immediately so background refetch keeps list fresh
    staleTime: 0,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      apiPost<ConversationDTO>('/conversations/rooms', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiPost(`/conversations/${conversationId}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}
