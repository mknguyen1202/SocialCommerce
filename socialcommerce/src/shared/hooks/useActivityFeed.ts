import { useInfiniteQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import type { ActivityEvent, ActivityEventType, NotificationDomain } from '../types/domain';

// ─── DTO ─────────────────────────────────────────────────────────────────────

interface ActivityEventDTO {
  id: string;
  type: ActivityEventType;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    presence: string;
  };
  title: string;
  body?: string;
  link_url: string;
  domain: NotificationDomain;
  created_at: string;
}

interface ActivityPageDTO {
  items: ActivityEventDTO[];
  next_cursor: string | null;
}

function mapActivityEvent(dto: ActivityEventDTO): ActivityEvent {
  return {
    id: dto.id,
    type: dto.type,
    actor: {
      id: dto.actor.id,
      username: dto.actor.username,
      displayName: dto.actor.display_name,
      avatarUrl: dto.actor.avatar_url,
      presence: dto.actor.presence as ActivityEvent['actor']['presence'],
      lastSeen: new Date(),
    },
    title: dto.title,
    body: dto.body,
    linkUrl: dto.link_url,
    domain: dto.domain,
    createdAt: new Date(dto.created_at),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActivityFeed() {
  return useInfiniteQuery({
    queryKey: ['activity-feed'],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam as string)}` : '';
      return apiGet<ActivityPageDTO>(`/api/activity?limit=20${cursor}`).then((page) => ({
        items: page.items.map(mapActivityEvent),
        nextCursor: page.next_cursor,
      }));
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60,
  });
}
