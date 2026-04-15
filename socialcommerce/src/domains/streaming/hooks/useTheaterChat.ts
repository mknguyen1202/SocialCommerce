import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiDelete, apiPatch } from '../../../shared/api/client';
import type { TheaterChatMessage, Emote } from '../../../shared/types/domain';
import { useChannel, useSocket } from '../../../shared/realtime/useSocket';
import { useStreamingStore } from '../stores/streamingStore';

interface TheaterChatMessageDTO {
  id: string;
  theater_id: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string;
  sender_avatar_url: string;
  content: string;
  emotes: Array<{ code: string; image_url: string; category: string }>;
  created_at: string;
  is_deleted: boolean;
}

function mapChatMessage(dto: TheaterChatMessageDTO): TheaterChatMessage {
  return {
    id: dto.id,
    theaterId: dto.theater_id,
    sender: {
      id: dto.sender_id,
      username: dto.sender_username,
      displayName: dto.sender_display_name,
      avatarUrl: dto.sender_avatar_url,
      presence: 'online',
      lastSeen: new Date(),
    },
    content: dto.content,
    emotes: dto.emotes.map((e) => ({
      code: e.code,
      imageUrl: e.image_url,
      category: e.category as Emote['category'],
    })),
    createdAt: new Date(dto.created_at),
    isDeleted: dto.is_deleted,
  };
}

/**
 * Subscribes to real-time theater chat events and populates the store.
 * Call once at the TheaterView level.
 */
export function useTheaterChatSubscription(theaterId: string) {
  const { addChatMessage, deleteChatMessage, setPlayback } = useStreamingStore();

  const onNewMessage = useCallback(
    (payload: unknown) => {
      const msg = mapChatMessage(payload as TheaterChatMessageDTO);
      addChatMessage(msg);
    },
    [addChatMessage]
  );

  const onDeleteMessage = useCallback(
    (payload: unknown) => {
      const p = payload as { messageId: string };
      deleteChatMessage(p.messageId);
    },
    [deleteChatMessage]
  );

  const onPlaybackSync = useCallback(
    (payload: unknown) => {
      const p = payload as { position: number; isPlaying: boolean };
      setPlayback({ position: p.position, isPlaying: p.isPlaying, updatedAt: new Date() });
    },
    [setPlayback]
  );

  useChannel(`theater:${theaterId}`, 'theater:chat_message', onNewMessage);
  useChannel(`theater:${theaterId}`, 'theater:chat_delete', onDeleteMessage);
  useChannel(`theater:${theaterId}`, 'theater:playback_sync', onPlaybackSync);
}

export function useSendChatMessage(theaterId: string) {
  const { send } = useSocket(`theater:${theaterId}`);
  const { addChatMessage } = useStreamingStore();

  return (content: string, currentUserId: string, displayName: string, avatarUrl: string) => {
    const optimistic: TheaterChatMessage = {
      id: `opt-${Date.now()}`,
      theaterId,
      sender: {
        id: currentUserId,
        username: '',
        displayName,
        avatarUrl,
        presence: 'online',
        lastSeen: new Date(),
      },
      content,
      emotes: [],
      createdAt: new Date(),
      isDeleted: false,
    };
    addChatMessage(optimistic);
    send('theater:chat_message', { content });
  };
}

export function useDeleteChatMessage(theaterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      await apiDelete(`/api/theaters/${theaterId}/chat/${messageId}`);
    },
    onSuccess: (_data, messageId) => {
      useStreamingStore.getState().deleteChatMessage(messageId);
      queryClient.invalidateQueries({ queryKey: ['theater', theaterId, 'chat'] });
    },
  });
}

export function useSetSlowMode(theaterId: string) {
  return useMutation({
    mutationFn: async (seconds: number) => {
      await apiPatch(`/api/theaters/${theaterId}/slow-mode`, { seconds });
    },
  });
}

export function useInviteToTheater(theaterId: string) {
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      await apiPost(`/api/theaters/${theaterId}/invite`, { user_ids: userIds });
    },
  });
}

export function useSyncPlayback(theaterId: string) {
  const { send } = useSocket(`theater:${theaterId}`);

  return (position: number, isPlaying: boolean) => {
    send('theater:playback_sync', { position, is_playing: isPlaying });
  };
}
