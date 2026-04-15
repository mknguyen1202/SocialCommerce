import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import type { Comment, VoteDirection } from '../../../shared/types/domain';

export type CommentSort = 'best' | 'new' | 'top' | 'controversial';

interface CommentDTO {
  id: string;
  post_id: string;
  parent_id?: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote?: 'up' | 'down' | null;
  replies: CommentDTO[];
  reply_count: number;
  created_at: string;
  edited_at?: string;
}

function mapComment(dto: CommentDTO): Comment {
  return {
    id: dto.id,
    postId: dto.post_id,
    parentId: dto.parent_id,
    author: {
      id: dto.author_id,
      username: dto.author_username,
      displayName: dto.author_display_name,
      avatarUrl: dto.author_avatar_url,
      presence: 'offline',
      lastSeen: new Date(),
    },
    body: dto.body,
    upvotes: dto.upvotes,
    downvotes: dto.downvotes,
    score: dto.score,
    userVote: dto.user_vote,
    replies: dto.replies.map(mapComment),
    replyCount: dto.reply_count,
    createdAt: new Date(dto.created_at),
    editedAt: dto.edited_at ? new Date(dto.edited_at) : undefined,
    isCollapsed: false,
  };
}

export function useComments(postId: string, sort: CommentSort = 'best') {
  return useQuery<Comment[]>({
    queryKey: ['comments', postId, sort],
    queryFn: async () => {
      const data = await apiGet<CommentDTO[]>(
        `/api/posts/${postId}/comments?sort=${sort}`
      );
      return data.map(mapComment);
    },
    enabled: !!postId,
  });
}

export function useVoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      direction,
    }: {
      commentId: string;
      postId: string;
      direction: VoteDirection | null;
    }) => {
      if (direction === null) {
        await apiDelete(`/api/comments/${commentId}/vote`);
      } else {
        await apiPost(`/api/comments/${commentId}/vote`, { direction });
      }
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      parentId,
      body,
    }: {
      postId: string;
      parentId?: string;
      body: string;
    }) => {
      const dto = await apiPost<CommentDTO>(`/api/posts/${postId}/comments`, {
        parent_id: parentId,
        body,
      });
      return mapComment(dto);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      body,
    }: {
      commentId: string;
      postId: string;
      body: string;
    }) => {
      await apiPatch(`/api/comments/${commentId}`, { body });
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
    }: {
      commentId: string;
      postId: string;
    }) => {
      await apiDelete(`/api/comments/${commentId}`);
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
