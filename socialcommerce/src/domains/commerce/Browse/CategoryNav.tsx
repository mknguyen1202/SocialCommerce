import React, { useState } from 'react';
import { useCategories } from '../hooks/useProducts';
import { useCommerceStore } from '../stores/commerceStore';
import type { Category } from '../../../shared/types/domain';
import { Skeleton } from '../../../shared/components/Skeleton';

const CategoryItem: React.FC<{
  cat: Category;
  activeId: string | undefined;
  onSelect: (id: string | undefined) => void;
  depth?: number;
}> = ({ cat, activeId, onSelect, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (cat.children?.length ?? 0) > 0;
  const isActive = activeId === cat.id;

  return (
    <li style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      <button
        onClick={() => {
          onSelect(isActive ? undefined : cat.id);
          if (hasChildren) setExpanded((v) => !v);
        }}
        aria-pressed={isActive}
        style={{
          width: '100%',
          textAlign: 'left',
          background: isActive ? 'var(--color-brand-primary)' : 'transparent',
          color: isActive ? '#fff' : 'var(--color-text-secondary)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: `var(--space-1) var(--space-2)`,
          paddingLeft: `calc(var(--space-2) + ${depth * 12}px)`,
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background var(--transition-fast)',
        }}
      >
        <span>{cat.name}</span>
        {hasChildren && <span style={{ fontSize: 10, opacity: 0.6 }}>{expanded ? '▾' : '▸'}</span>}
      </button>
      {hasChildren && expanded && (
        <ul style={{ margin: 0, padding: 0 }}>
          {cat.children!.map((child) => (
            <CategoryItem key={child.id} cat={child} activeId={activeId} onSelect={onSelect} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const CategoryNav: React.FC = () => {
  const { data: categories, isLoading } = useCategories();
  const { filters, patchFilters } = useCommerceStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 28, borderRadius: 'var(--radius-sm)' }} />)}
      </div>
    );
  }

  return (
    <nav aria-label="Product categories">
      <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'] }}>
        Categories
      </p>
      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <li style={{ listStyle: 'none' }}>
          <button
            onClick={() => patchFilters({ categoryId: undefined })}
            aria-pressed={!filters.categoryId}
            style={{
              width: '100%', textAlign: 'left',
              background: !filters.categoryId ? 'var(--color-brand-primary)' : 'transparent',
              color: !filters.categoryId ? '#fff' : 'var(--color-text-secondary)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: 'var(--font-size-sm)', cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
          >
            All Products
          </button>
        </li>
        {categories?.map((cat) => (
          <CategoryItem
            key={cat.id}
            cat={cat}
            activeId={filters.categoryId}
            onSelect={(id) => patchFilters({ categoryId: id })}
          />
        ))}
      </ul>
    </nav>
  );
};
