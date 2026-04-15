import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useProducts } from '../hooks/useProducts';
import { useCommerceStore } from '../stores/commerceStore';
import { ProductCard } from './ProductCard';
import { Skeleton } from '../../../shared/components/Skeleton';
import { SortDropdown } from './SortDropdown';
import { FilterPanel } from './FilterPanel';

export const ProductGrid: React.FC = () => {
  const navigate = useNavigate();
  const { filters } = useCommerceStore();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProducts(filters);

  const products = data?.pages.flatMap((p) => p.items) ?? [];

  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Trigger load more via IntersectionObserver
  const fetchNextRef = useRef(fetchNextPage);
  fetchNextRef.current = fetchNextPage;
  const hasNextRef = useRef(hasNextPage);
  hasNextRef.current = hasNextPage;
  const isFetchingRef = useRef(isFetchingNextPage);
  isFetchingRef.current = isFetchingNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextRef.current && !isFetchingRef.current) {
          fetchNextRef.current();
        }
      },
      { root: parentRef.current, rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Column-aware virtualizer for the grid
  const COLS = 3;
  const rowCount = Math.ceil(products.length / COLS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 340,
    overscan: 3,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <FilterPanel />
        <SortDropdown />
      </div>

      {/* Grid */}
      <div
        ref={parentRef}
        style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}
      >
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 'var(--space-3)' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 320, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 80, color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: 48 }}>🔍</span>
            <p style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>No products found</p>
          </div>
        ) : (
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * COLS;
              const rowProducts = products.slice(startIdx, startIdx + COLS);
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: virtualRow.start,
                    left: 0,
                    right: 0,
                    height: virtualRow.size,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gap: 'var(--space-3)',
                    paddingBottom: 'var(--space-3)',
                  }}
                >
                  {rowProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => navigate(`/commerce/product/${product.id}`)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {isFetchingNextPage && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 320, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        )}

        {/* Sentinel for IntersectionObserver-based infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  );
};
