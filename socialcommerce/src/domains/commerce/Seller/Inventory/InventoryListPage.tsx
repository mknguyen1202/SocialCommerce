import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSellerProducts, useDeleteProduct, useBulkImportProducts } from '../../hooks/useSellerProducts';
import { useSellerStore } from '../../stores/sellerStore';
import type { ProductStatus, SellerProduct } from '../types';

interface InventoryListPageProps {
  shopId: string | null;
}

const STATUS_BADGE: Record<ProductStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Active', color: '#10b981', bg: '#10b98122' },
  DRAFT: { label: 'Draft', color: '#6b7280', bg: '#6b728022' },
  ARCHIVED: { label: 'Archived', color: '#f59e0b', bg: '#f59e0b22' },
  OUT_OF_STOCK: { label: 'Out of stock', color: '#ef4444', bg: '#ef444422' },
};

export const InventoryListPage: React.FC<InventoryListPageProps> = ({ shopId }) => {
  const navigate = useNavigate();
  const {
    inventorySearch, setInventorySearch,
    inventoryStatusFilter, setInventoryStatusFilter,
    inventoryLowStockOnly, setInventoryLowStockOnly,
    selectedProductIds, toggleProductSelection, clearProductSelection, selectAllProducts,
  } = useSellerStore();

  const { data: products, isLoading } = useSellerProducts(shopId);
  const deleteProduct = useDeleteProduct(shopId!);
  const bulkImport = useBulkImportProducts(shopId!);

  const [bulkAction, setBulkAction] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleBulkAction = useCallback(async () => {
    if (bulkAction === 'delete') {
      if (!window.confirm(`Delete ${selectedProductIds.size} product(s)? This cannot be undone.`)) return;
      await Promise.all([...selectedProductIds].map(id => deleteProduct.mutateAsync(id)));
      clearProductSelection();
    }
    setBulkAction('');
  }, [bulkAction, selectedProductIds, deleteProduct, clearProductSelection]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const rows = JSON.parse(text) as Partial<SellerProduct>[];
      await bulkImport.mutateAsync(rows);
    } catch {
      alert('Invalid JSON file. Please upload a valid product list.');
    }
    e.target.value = '';
  }, [bulkImport]);

  const allIds = products?.map(p => p.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selectedProductIds.has(id));

  const containerStyle: React.CSSProperties = {
    padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
    height: '100%', overflowY: 'auto',
  };

  return (
    <div style={containerStyle} role="main" aria-label="Inventory">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Inventory</h1>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={() => fileInputRef.current?.click()} style={secondaryBtnStyle}>
            ↑ Import JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImport} aria-label="Import products JSON" />
          <Link to="../inventory/new" style={{ ...primaryBtnStyle, textDecoration: 'none' }}>
            + Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          aria-label="Search products"
          placeholder="Search products…"
          value={inventorySearch}
          onChange={e => setInventorySearch(e.target.value)}
          style={searchInputStyle}
        />
        <select
          aria-label="Filter by status"
          value={inventoryStatusFilter ?? ''}
          onChange={e => setInventoryStatusFilter((e.target.value as ProductStatus) || null)}
          style={selectStyle}
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_BADGE) as ProductStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_BADGE[s].label}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={inventoryLowStockOnly} onChange={e => setInventoryLowStockOnly(e.target.checked)} />
          Low stock only
        </label>

        {selectedProductIds.size > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {selectedProductIds.size} selected
            </span>
            <select
              aria-label="Bulk action"
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              style={{ ...selectStyle, color: bulkAction ? 'var(--color-danger)' : undefined }}
            >
              <option value="">Bulk action…</option>
              <option value="delete">Delete selected</option>
            </select>
            {bulkAction && (
              <button onClick={handleBulkAction} style={{ ...secondaryBtnStyle, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                Apply
              </button>
            )}
            <button onClick={clearProductSelection} style={secondaryBtnStyle} aria-label="Clear selection">✕ Clear</button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingRows />
      ) : !products || products.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }} aria-label="Products table">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', width: 32 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={allSelected}
                    onChange={() => allSelected ? clearProductSelection() : selectAllProducts(allIds)}
                  />
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }}>Product</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }}>SKU / Variants</th>
                <th style={{ padding: '10px 12px', fontWeight: 500, textAlign: 'right' }}>Price</th>
                <th style={{ padding: '10px 12px', fontWeight: 500, textAlign: 'right' }}>Stock</th>
                <th style={{ padding: '10px 12px', fontWeight: 500 }}>Category</th>
                <th style={{ padding: '10px 12px', width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
                const minPrice = Math.min(...product.variants.map(v => v.price));
                const maxPrice = Math.max(...product.variants.map(v => v.price));
                const isLowStock = product.variants.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
                const badge = STATUS_BADGE[product.status];
                const selected = selectedProductIds.has(product.id);

                return (
                  <ProductRow
                    key={product.id}
                    product={product}
                    totalStock={totalStock}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    isLowStock={isLowStock}
                    badge={badge}
                    selected={selected}
                    onToggle={() => toggleProductSelection(product.id)}
                    onEdit={() => navigate(`../inventory/${product.id}`)}
                    onDelete={async () => {
                      if (window.confirm(`Delete "${product.title}"? This cannot be undone.`)) {
                        await deleteProduct.mutateAsync(product.id);
                      }
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface ProductRowProps {
  product: SellerProduct;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  isLowStock: boolean;
  badge: { label: string; color: string; bg: string };
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product, totalStock, minPrice, maxPrice, isLowStock, badge, selected, onToggle, onEdit, onDelete,
}) => {
  const [hover, setHover] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderTop: '1px solid var(--color-border-default)',
        background: selected ? 'var(--color-surface-2)' : hover ? 'var(--color-surface-1)' : 'transparent',
        transition: 'background 120ms',
      }}
    >
      <td style={{ padding: '10px 12px' }}>
        <input type="checkbox" aria-label={`Select ${product.title}`} checked={selected} onChange={onToggle} />
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.title} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 18 }}>📦</div>
          )}
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.title}
            </div>
            {product.tags.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--color-surface-3)', borderRadius: 10, color: 'var(--color-text-muted)', marginRight: 4 }}>{t}</span>
            ))}
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg }}>
          {badge.label}
        </span>
      </td>
      <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
        {product.variants.length === 1 ? product.variants[0].sku : `${product.variants.length} variants`}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 500 }}>
        {minPrice === maxPrice ? `$${minPrice}` : `$${minPrice}–$${maxPrice}`}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <span style={{ color: isLowStock ? 'var(--color-warning)' : 'var(--color-text-primary)', fontWeight: isLowStock ? 700 : 400 }}>
          {totalStock} {isLowStock ? '⚠️' : ''}
        </span>
      </td>
      <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
        {product.category}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button onClick={onEdit} aria-label={`Edit ${product.title}`} style={iconBtnStyle} title="Edit">✏️</button>
          <button onClick={onDelete} aria-label={`Delete ${product.title}`} style={{ ...iconBtnStyle, color: 'var(--color-danger)' }} title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  );
};

const EmptyState = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-10)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
    <span style={{ fontSize: 48 }}>📦</span>
    <p style={{ margin: 0 }}>No products yet. Add your first product to get started.</p>
    <Link to="../inventory/new" style={primaryBtnStyle}>+ Add Product</Link>
  </div>
);

const LoadingRows = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--space-4)' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} style={{ height: 52, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', opacity: 0.5 + i * 0.1 }} />
    ))}
  </div>
);

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: 'var(--space-2) var(--space-4)',
  background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)',
};

const searchInputStyle: React.CSSProperties = {
  padding: '7px 12px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', minWidth: 200,
};

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1,
};
