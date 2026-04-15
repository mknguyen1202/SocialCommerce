import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import type { Post, VoteDirection, Paginated, PostType } from '../../../shared/types/domain';
import { mapPostDTO } from './useFeed';

export function usePost(postId: string) {
  return useQuery<Post>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const dto = await apiGet<Parameters<typeof mapPostDTO>[0]>(`/api/posts/${postId}`);
      return mapPostDTO(dto);
    },
    enabled: !!postId,
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      direction,
    }: {
      postId: string;
      direction: VoteDirection | null;
    }) => {
      if (direction === null) {
        await apiDelete(`/api/posts/${postId}/vote`);
      } else {
        await apiPost(`/api/posts/${postId}/vote`, { direction });
      }
    },
    onMutate: async ({ postId, direction }) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const prev = queryClient.getQueryData<Post>(['post', postId]);
      if (prev) {
        const prevVote = prev.userVote;
        const scoreDelta =
          direction === 'up'
            ? prevVote === 'up' ? 0 : prevVote === 'down' ? 2 : 1
            : direction === 'down'
            ? prevVote === 'down' ? 0 : prevVote === 'up' ? -2 : -1
            : prevVote === 'up' ? -1 : 1;
        queryClient.setQueryData<Post>(['post', postId], {
          ...prev,
          userVote: direction,
          score: prev.score + scoreDelta,
        });
      }
      // Optimistically update feed caches too
      queryClient.setQueriesData<InfiniteData<Paginated<Post>>>(
        { queryKey: ['feed'] },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((p) =>
                    p.id === postId ? { ...p, userVote: direction } : p
                  ),
                })),
              }
            : data
      );
      return { prev };
    },
    onError: (_err, { postId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['post', postId], ctx.prev);
    },
  });
}

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, save }: { postId: string; save: boolean }) => {
      if (save) {
        await apiPost(`/api/posts/${postId}/save`, {});
      } else {
        await apiDelete(`/api/posts/${postId}/save`);
      }
    },
    onMutate: async ({ postId, save }) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const prev = queryClient.getQueryData<Post>(['post', postId]);
      if (prev) {
        queryClient.setQueryData<Post>(['post', postId], { ...prev, isSaved: save });
      }
      return { prev };
    },
    onError: (_err, { postId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['post', postId], ctx.prev);
    },
  });
}

interface CreatePostInput {
  type: PostType;
  title: string;
  body: string;
  groupSlug?: string;
  mediaUrls?: string[];
  linkUrl?: string;
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const dto = await apiPost<Parameters<typeof mapPostDTO>[0]>('/api/posts', {
        type: input.type,
        title: input.title,
        body: input.body,
        group_slug: input.groupSlug,
        media_urls: input.mediaUrls,
        link_url: input.linkUrl,
      });
      return mapPostDTO(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useEditPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      title,
      body,
    }: {
      postId: string;
      title: string;
      body: string;
    }) => {
      await apiPatch(`/api/posts/${postId}`, { title, body });
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await apiDelete(`/api/posts/${postId}`);
    },
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
