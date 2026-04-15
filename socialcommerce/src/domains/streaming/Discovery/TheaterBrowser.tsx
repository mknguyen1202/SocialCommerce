import React, { useRef, useEffect } from 'react';
import { useStreamingStore } from '../stores/streamingStore';
import { useTheaters } from '../hooks/useTheaters';
import { TheaterCard } from './TheaterCard';
import { CategoryFilter } from './CategoryFilter';
import { TheaterSearch } from './TheaterSearch';
import { Skeleton } from '../../../shared/components/Skeleton';

export const TheaterBrowser: React.FC = () => {
  const { categoryFilter, setCategoryFilter, searchQuery } = useStreamingStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useTheaters({
    category: categoryFilter ?? undefined,
    q: searchQuery || undefined,
  });

  const theaters = data?.pages.flatMap((p) => p.items) ?? [];

  const fetchNextRef = useRef(fetchNextPage);
  fetchNextRef.current = fetchNextPage;
  const hasNextRef = useRef(hasNextPage);
  hasNextRef.current = hasNextPage;
  const fetchingRef = useRef(isFetchingNextPage);
  fetchingRef.current = isFetchingNextPage;

  // IntersectionObserver-based infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextRef.current && !fetchingRef.current) {
          fetchNextRef.current();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={parentRef}
      style={{ height: '100%', overflowY: 'auto', padding: 'var(--space-6)' }}
    >
      <h1
        style={{
          margin: '0 0 var(--space-4)',
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
        }}
      >
        Browse Theaters
      </h1>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <TheaterSearch />
      </div>

      <div style={{ marginBottom: 'var(--space-5)' }}>
        <CategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />
      </div>

      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={200} />
          ))}
        </div>
      ) : theaters.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-12)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span style={{ fontSize: 48 }}>🎬</span>
          <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-md)' }}>
            No theaters found. Be the first to go live!
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {theaters.map((theater) => (
            <TheaterCard key={theater.id} theater={theater} />
          ))}
        </div>
      )}

      {isFetchingNextPage && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-4)',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={200} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
};
