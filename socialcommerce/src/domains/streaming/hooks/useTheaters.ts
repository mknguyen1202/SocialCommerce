import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import type {
  Theater,
  TheaterParticipant,
  TheaterStatus,
  TheaterVisibility,
  ContentSource,
  ContentSourceType,
  TheaterParticipantRole,
  Paginated,
} from '../../../shared/types/domain';
import { useChannel } from '../../../shared/realtime/useSocket';
import { useStreamingStore } from '../stores/streamingStore';

// ─── DTOs ────────────────────────────────────────────────────────────────────

interface TheaterDTO {
  id: string;
  host_id: string;
  host_username: string;
  host_display_name: string;
  host_avatar_url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  status: string;
  content_source_type: string;
  content_source_url?: string;
  content_source_media_id?: string;
  viewer_count: number;
  max_viewers?: number;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

interface TheaterParticipantDTO {
  user_id: string;
  user_username: string;
  user_display_name: string;
  user_avatar_url: string;
  role: string;
  joined_at: string;
  is_chat_muted: boolean;
}

interface TheatersPageDTO {
  data: TheaterDTO[];
  next_cursor: string | null;
  has_more: boolean;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapTheater(dto: TheaterDTO): Theater {
  return {
    id: dto.id,
    host: {
      id: dto.host_id,
      username: dto.host_username,
      displayName: dto.host_display_name,
      avatarUrl: dto.host_avatar_url,
      presence: 'online',
      lastSeen: new Date(),
    },
    title: dto.title,
    description: dto.description,
    category: dto.category,
    tags: dto.tags,
    visibility: dto.visibility as TheaterVisibility,
    status: dto.status as TheaterStatus,
    contentSource: {
      type: dto.content_source_type as ContentSourceType,
      url: dto.content_source_url,
      mediaId: dto.content_source_media_id,
    },
    viewerCount: dto.viewer_count,
    maxViewers: dto.max_viewers,
    scheduledAt: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
    startedAt: dto.started_at ? new Date(dto.started_at) : undefined,
    endedAt: dto.ended_at ? new Date(dto.ended_at) : undefined,
    createdAt: new Date(dto.created_at),
  };
}

function mapParticipant(dto: TheaterParticipantDTO): TheaterParticipant {
  return {
    user: {
      id: dto.user_id,
      username: dto.user_username,
      displayName: dto.user_display_name,
      avatarUrl: dto.user_avatar_url,
      presence: 'online',
      lastSeen: new Date(),
    },
    role: dto.role as TheaterParticipantRole,
    joinedAt: new Date(dto.joined_at),
    isChatMuted: dto.is_chat_muted,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export interface TheaterFilters {
  category?: string;
  status?: TheaterStatus;
  q?: string;
}

export function useTheaters(filters: TheaterFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);

  return useInfiniteQuery<Paginated<Theater>>({
    queryKey: ['theaters', filters],
    queryFn: async ({ pageParam }) => {
      if (pageParam) params.set('cursor', pageParam as string);
      const dto = await apiGet<TheatersPageDTO>(`/api/theaters?${params.toString()}`);
      return {
        items: dto.data.map(mapTheater),
        nextCursor: dto.next_cursor,
        hasMore: dto.has_more,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useTheater(id: string) {
  const { setViewerCount } = useStreamingStore();

  const query = useQuery<Theater>({
    queryKey: ['theater', id],
    queryFn: async () => {
      const dto = await apiGet<TheaterDTO>(`/api/theaters/${id}`);
      const theater = mapTheater(dto);
      setViewerCount(theater.viewerCount);
      return theater;
    },
    enabled: !!id,
  });

  const queryClient = useQueryClient();

  // Real-time: theater status changes
  const onStatus = useCallback(
    (payload: unknown) => {
      const p = payload as { theaterId: string; status: TheaterStatus };
      if (p.theaterId !== id) return;
      queryClient.setQueryData<Theater>(['theater', id], (old) =>
        old ? { ...old, status: p.status } : old
      );
    },
    [id, queryClient]
  );

  // Real-time: viewer count changes
  const onViewerJoined = useCallback(
    (payload: unknown) => {
      const p = payload as { theaterId: string };
      if (p.theaterId !== id) return;
      setViewerCount(useStreamingStore.getState().viewerCount + 1);
    },
    [id, setViewerCount]
  );

  const onViewerLeft = useCallback(
    (payload: unknown) => {
      const p = payload as { theaterId: string };
      if (p.theaterId !== id) return;
      setViewerCount(Math.max(0, useStreamingStore.getState().viewerCount - 1));
    },
    [id, setViewerCount]
  );

  useChannel(`theater:${id}`, 'theater:status', onStatus);
  useChannel(`theater:${id}`, 'theater:viewer_joined', onViewerJoined);
  useChannel(`theater:${id}`, 'theater:viewer_left', onViewerLeft);

  return query;
}

export function useTheaterParticipants(theaterId: string) {
  return useQuery<TheaterParticipant[]>({
    queryKey: ['theater', theaterId, 'participants'],
    queryFn: async () => {
      const data = await apiGet<TheaterParticipantDTO[]>(
        `/api/theaters/${theaterId}/participants`
      );
      return data.map(mapParticipant);
    },
    enabled: !!theaterId,
    refetchInterval: 30_000,
  });
}

export function useCreateTheater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      category: string;
      tags: string[];
      visibility: TheaterVisibility;
      contentSource: ContentSource;
      scheduledAt?: Date;
    }) => {
      const dto = await apiPost<TheaterDTO>('/api/theaters', {
        title: input.title,
        description: input.description,
        category: input.category,
        tags: input.tags,
        visibility: input.visibility,
        content_source_type: input.contentSource.type,
        content_source_url: input.contentSource.url,
        content_source_media_id: input.contentSource.mediaId,
        scheduled_at: input.scheduledAt?.toISOString(),
      });
      return mapTheater(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theaters'] });
    },
  });
}

export function useUpdateTheaterStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ theaterId, status }: { theaterId: string; status: TheaterStatus }) => {
      const dto = await apiPatch<TheaterDTO>(`/api/theaters/${theaterId}/status`, { status });
      return mapTheater(dto);
    },
    onSuccess: (theater) => {
      queryClient.setQueryData(['theater', theater.id], theater);
      queryClient.invalidateQueries({ queryKey: ['theaters'] });
    },
  });
}

export function useJoinTheater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (theaterId: string) => {
      await apiPost(`/api/theaters/${theaterId}/join`, {});
    },
    onSuccess: (_data, theaterId) => {
      queryClient.invalidateQueries({ queryKey: ['theater', theaterId, 'participants'] });
    },
  });
}

export function useLeaveTheater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (theaterId: string) => {
      await apiPost(`/api/theaters/${theaterId}/leave`, {});
    },
    onSuccess: (_data, theaterId) => {
      queryClient.invalidateQueries({ queryKey: ['theater', theaterId, 'participants'] });
    },
  });
}

export function useKickParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ theaterId, userId }: { theaterId: string; userId: string }) => {
      await apiDelete(`/api/theaters/${theaterId}/participants/${userId}`);
    },
    onSuccess: (_data, { theaterId }) => {
      queryClient.invalidateQueries({ queryKey: ['theater', theaterId, 'participants'] });
    },
  });
}

export function useMuteParticipantChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      theaterId,
      userId,
      mute,
    }: {
      theaterId: string;
      userId: string;
      mute: boolean;
    }) => {
      await apiPatch(`/api/theaters/${theaterId}/participants/${userId}/chat-mute`, { mute });
    },
    onSuccess: (_data, { theaterId }) => {
      queryClient.invalidateQueries({ queryKey: ['theater', theaterId, 'participants'] });
    },
  });
}

export const THEATER_CATEGORIES = [
  'Gaming',
  'Music',
  'Film & TV',
  'Sports',
  'Cooking',
  'Art & Creative',
  'Talk Shows',
  'Education',
  'Just Chatting',
];
