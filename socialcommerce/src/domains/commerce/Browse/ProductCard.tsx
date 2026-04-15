import React from 'react';
import type { Product } from '../../../shared/types/domain';
import { Badge } from '../../../shared/components/Badge';
import { PriceDisplay } from '../Product/PriceDisplay';
import { useCommerceStore } from '../stores/commerceStore';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onClick }) => {
  const { openMiniCart, addToCart } = useCommerceStore();
  const defaultVariant = product.variants[0];
  const isOutOfStock = product.availability === 'out_of_stock';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!defaultVariant || isOutOfStock) return;
    addToCart({ product, variant: defaultVariant, quantity: 1 });
    openMiniCart();
  };

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(product.rating) ? '★' : '☆').join('');

  return (
    <article
      onClick={onClick}
      style={{
        background: 'var(--color-surface-3)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
      aria-label={product.title}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
        {product.images[0] ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt}
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--color-text-muted)' }}>🛒</div>
        )}
        {product.compareAtPrice && product.compareAtPrice.amount > product.price.amount && (
          <Badge
            label="Sale"
            variant="danger"
            style={{ position: 'absolute', top: 8, left: 8 }}
          />
        )}
        {product.availability === 'low_stock' && (
          <Badge
            label="Low Stock"
            variant="warning"
            style={{ position: 'absolute', top: 8, right: 8 }}
          />
        )}
        {isOutOfStock && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            fontSize: 'var(--font-size-sm)',
          }}>
            Out of Stock
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1 }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {product.vendor.name}
        </p>
        <h3 style={{
          margin: 0,
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
          overflow: 'hidden',
        }}>
          {product.title}
        </h3>

        {product.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ color: '#f5c518', fontSize: 'var(--font-size-xs)' }}>{stars}</span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              ({product.reviewCount})
            </span>
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={`Add ${product.title} to cart`}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              border: 'none',
              background: isOutOfStock ? 'var(--color-surface-2)' : 'var(--color-brand-primary)',
              color: isOutOfStock ? 'var(--color-text-muted)' : '#fff',
              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
              fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
});
