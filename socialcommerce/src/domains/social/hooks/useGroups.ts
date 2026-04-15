import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import type { Group, GroupRule, GroupVisibility, GroupRole } from '../../../shared/types/domain';

interface GroupDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  visibility: string;
  member_count: number;
  rules: Array<{ id: string; title: string; description: string; order: number }>;
  user_role?: string | null;
  created_at: string;
}

function mapGroup(dto: GroupDTO): Group {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    description: dto.description,
    avatarUrl: dto.avatar_url,
    bannerUrl: dto.banner_url,
    visibility: dto.visibility as GroupVisibility,
    memberCount: dto.member_count,
    rules: dto.rules,
    userRole: dto.user_role as GroupRole | null | undefined,
    createdAt: new Date(dto.created_at),
  };
}

export function useGroup(slug: string) {
  return useQuery<Group>({
    queryKey: ['group', slug],
    queryFn: async () => {
      const dto = await apiGet<GroupDTO>(`/api/groups/${slug}`);
      return mapGroup(dto);
    },
    enabled: !!slug,
  });
}

export function useGroupSearch(query: string) {
  return useQuery<Group[]>({
    queryKey: ['groups', 'search', query],
    queryFn: async () => {
      const data = await apiGet<GroupDTO[]>(
        `/api/groups?q=${encodeURIComponent(query)}`
      );
      return data.map(mapGroup);
    },
    enabled: query.length >= 1,
  });
}

export function useMyGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups', 'mine'],
    queryFn: async () => {
      const data = await apiGet<GroupDTO[]>('/api/groups/mine');
      return data.map(mapGroup);
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      visibility: GroupVisibility;
    }) => {
      const dto = await apiPost<GroupDTO>('/api/groups', {
        name: input.name,
        description: input.description,
        visibility: input.visibility,
      });
      return mapGroup(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      await apiPost(`/api/groups/${slug}/join`, {});
    },
    onSuccess: (_data, slug) => {
      queryClient.invalidateQueries({ queryKey: ['group', slug] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      await apiPost(`/api/groups/${slug}/leave`, {});
    },
    onSuccess: (_data, slug) => {
      queryClient.invalidateQueries({ queryKey: ['group', slug] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] });
    },
  });
}

export function useUpdateGroupRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, rules }: { slug: string; rules: GroupRule[] }) => {
      await apiPatch(`/api/groups/${slug}/rules`, { rules });
    },
    onSuccess: (_data, { slug }) => {
      queryClient.invalidateQueries({ queryKey: ['group', slug] });
    },
  });
}

export interface BanEntry {
  userId: string;
  username: string;
  reason: string;
  bannedAt: Date;
}

export function useGroupBans(slug: string) {
  return useQuery<BanEntry[]>({
    queryKey: ['group', slug, 'bans'],
    queryFn: async () => {
      const data = await apiGet<
        Array<{ user_id: string; username: string; reason: string; banned_at: string }>
      >(`/api/groups/${slug}/bans`);
      return data.map((b) => ({
        userId: b.user_id,
        username: b.username,
        reason: b.reason,
        bannedAt: new Date(b.banned_at),
      }));
    },
    enabled: !!slug,
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      userId,
      reason,
    }: {
      slug: string;
      userId: string;
      reason: string;
    }) => {
      await apiPost(`/api/groups/${slug}/bans`, { user_id: userId, reason });
    },
    onSuccess: (_data, { slug }) => {
      queryClient.invalidateQueries({ queryKey: ['group', slug, 'bans'] });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, userId }: { slug: string; userId: string }) => {
      await apiDelete(`/api/groups/${slug}/bans/${userId}`);
    },
    onSuccess: (_data, { slug }) => {
      queryClient.invalidateQueries({ queryKey: ['group', slug, 'bans'] });
    },
  });
}

export interface ModQueueItem {
  id: string;
  type: 'post' | 'comment';
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export function useModQueue(slug: string) {
  return useQuery<ModQueueItem[]>({
    queryKey: ['group', slug, 'modqueue'],
    queryFn: async () => {
      const data = await apiGet<
        Array<{
          id: string;
          type: string;
          content: string;
          author_id: string;
          author_name: string;
          created_at: string;
        }>
      >(`/api/groups/${slug}/modqueue`);
      return data.map((item) => ({
        id: item.id,
        type: item.type as 'post' | 'comment',
        content: item.content,
        authorId: item.author_id,
        authorName: item.author_name,
        createdAt: new Date(item.created_at),
      }));
    },
    enabled: !!slug,
  });
}

export function useModAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      itemId,
      action,
    }: {
      slug: string;
      itemId: string;
      action: 'approve' | 'remove';
    }) => {
      await apiPost(`/api/groups/${slug}/modqueue/${itemId}/${action}`, {});
    },
    onSuccess: (_data, { slug }) => {
      queryClient.invalidateQueries({ queryKey: ['group', slug, 'modqueue'] });
    },
  });
}
