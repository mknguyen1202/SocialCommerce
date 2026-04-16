import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client';
import type { Post, FeedSort, Paginated, GroupSummary, PostType } from '../../../shared/types/domain';
import { useChannel } from '../../../shared/realtime/useSocket';
import { useSocialStore } from '../stores/socialStore';

// 'home' | 'explore' | 'group:<slug>'
export type FeedType = 'home' | 'explore' | `group:${string}`;

interface PostDTO {
  id: string;
  author_user_id: string;
  author_username?: string;
  author_display_name?: string;
  author_avatar_url?: string;
  group_id?: string;
  group_name?: string;
  group_slug?: string;
  group_avatar_url?: string;
  type: string;
  title: string;
  body: string;
  media_urls?: string[];
  link_url?: string;
  upvotes: number;
  downvotes: number;
  score?: number;
  user_vote?: 'up' | 'down' | null;
  comment_count: number;
  share_count?: number;
  is_saved?: boolean;
  pending_review?: boolean;
  created_at: string;
  edited_at?: string;
  is_deleted?: boolean;
}

interface FeedPageDTO {
  data: PostDTO[];
  next_cursor: string | null;
  has_more: boolean;
}

export function mapPostDTO(dto: PostDTO): Post {
  const group: GroupSummary | undefined = dto.group_id
    ? {
        id: dto.group_id,
        name: dto.group_name ?? '',
        slug: dto.group_slug ?? '',
        avatarUrl: dto.group_avatar_url ?? '',
      }
    : undefined;

  return {
    id: dto.id,
    author: {
      id: dto.author_user_id,
      username: dto.author_username ?? '',
      displayName: dto.author_display_name ?? '',
      avatarUrl: dto.author_avatar_url ?? '',
      presence: 'offline',
      lastSeen: new Date(),
    },
    group,
    type: dto.type as PostType,
    title: dto.title,
    body: dto.body,
    mediaUrls: dto.media_urls ?? [],
    linkUrl: dto.link_url,
    upvotes: dto.upvotes,
    downvotes: dto.downvotes,
    score: dto.score ?? dto.upvotes - dto.downvotes,
    userVote: dto.user_vote,
    commentCount: dto.comment_count,
    shareCount: dto.share_count ?? 0,
    isSaved: dto.is_saved ?? false,
    createdAt: new Date(dto.created_at),
    editedAt: dto.edited_at ? new Date(dto.edited_at) : undefined,
  };
}

export function useFeed(feedType: FeedType, sort: FeedSort) {
  const queryClient = useQueryClient();
  const setNewPostsCount = useSocialStore((s) => s.setNewPostsCount);
  const queryKey = ['feed', feedType, sort] as const;

  const query = useInfiniteQuery<
    Paginated<Post>,
    Error,
    InfiniteData<Paginated<Post>>,
    typeof queryKey,
    string | null
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const isGroup = feedType.startsWith('group:');
      const path = isGroup
        ? `/api/groups/${feedType.slice(6)}/posts`
        : `/api/feed/${feedType}`;
      const params = new URLSearchParams({ sort });
      if (pageParam) params.set('cursor', pageParam);
      const result = await apiGet<FeedPageDTO>(`${path}?${params}`);
      return {
        items: result.data.map(mapPostDTO),
        nextCursor: result.next_cursor,
        hasMore: result.has_more,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  useChannel('feed', 'post:new', () => {
    setNewPostsCount(1);
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const posts = query.data?.pages.flatMap((p) => p.items) ?? [];

  return { ...query, posts, refetch };
}
