import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import type { UnifiedSearchResults } from '../types/domain';

interface SearchResultsDTO {
  query: string;
  users: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    presence: string;
  }>;
  posts: Array<{
    id: string;
    title: string;
    author_name: string;
    group_name?: string;
    score: number;
  }>;
  theaters: Array<{
    id: string;
    title: string;
    host_name: string;
    status: 'live' | 'scheduled' | 'ended';
    viewer_count: number;
  }>;
  products: Array<{
    id: string;
    title: string;
    vendor_name: string;
    price: { amount: number; currency: string };
    thumbnail_url?: string;
  }>;
}

function mapResults(dto: SearchResultsDTO): UnifiedSearchResults {
  return {
    query: dto.query,
    users: dto.users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      presence: u.presence as UnifiedSearchResults['users'][number]['presence'],
    })),
    posts: dto.posts.map((p) => ({
      id: p.id,
      title: p.title,
      authorName: p.author_name,
      groupName: p.group_name,
      score: p.score,
    })),
    theaters: dto.theaters.map((t) => ({
      id: t.id,
      title: t.title,
      hostName: t.host_name,
      status: t.status,
      viewerCount: t.viewer_count,
    })),
    products: dto.products.map((p) => ({
      id: p.id,
      title: p.title,
      vendorName: p.vendor_name,
      price: p.price,
      thumbnailUrl: p.thumbnail_url,
    })),
  };
}

export function useUnifiedSearch(query: string) {
  return useQuery({
    queryKey: ['unified-search', query],
    queryFn: () =>
      apiGet<SearchResultsDTO>(
        `/api/search?q=${encodeURIComponent(query)}&limit=5`
      ).then(mapResults),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}
