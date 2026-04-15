import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { ImageGallery } from './ImageGallery';
import { PriceDisplay } from './PriceDisplay';
import { VariantSelector } from './VariantSelector';
import { AddToCartButton } from './AddToCartButton';
import { VendorLink } from './VendorLink';
import { RelatedProducts } from './RelatedProducts';
import { ReviewList } from './ReviewSection/ReviewList';
import { Skeleton } from '../../../shared/components/Skeleton';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(id!);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  React.useEffect(() => {
    if (product?.variants[0]) setSelectedVariantId(product.variants[0].id);
  }, [product]);

  if (isLoading) return <ProductDetailSkeleton />;

  if (isError || !product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
        <span style={{ fontSize: 48 }}>😕</span>
        <p style={{ margin: 0 }}>Product not found.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  const availabilityLabel = product.availability === 'in_stock'
    ? '✅ In Stock'
    : product.availability === 'low_stock'
    ? '⚠️ Low Stock'
    : '❌ Out of Stock';

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-6)' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-4)' }}>
          <button onClick={() => navigate('/commerce')} style={breadcrumbBtn}>Shop</button>
          <span style={{ color: 'var(--color-text-muted)', margin: '0 var(--space-2)' }}>›</span>
          <button onClick={() => navigate(`/commerce?category=${product.category.id}`)} style={breadcrumbBtn}>
            {product.category.name}
          </button>
          <span style={{ color: 'var(--color-text-muted)', margin: '0 var(--space-2)' }}>›</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{product.title}</span>
        </nav>

        {/* Main content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>
          {/* Left: image gallery */}
          <div>
            <ImageGallery images={product.images} title={product.title} />
          </div>

          {/* Right: product info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Tags */}
            {product.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                {product.tags.map((tag) => (
                  <Badge key={tag} label={tag} variant="default" />
                ))}
              </div>
            )}

            <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {product.title}
            </h1>

            {/* Rating summary */}
            {product.rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: '#f5c518' }}>{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <PriceDisplay price={selectedVariant?.price ?? product.price} compareAtPrice={product.compareAtPrice} size="lg" />

            {/* Availability */}
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {availabilityLabel}
            </p>

            {/* Variants */}
            {product.variants.length > 1 && (
              <VariantSelector
                variants={product.variants}
                selectedId={selectedVariantId}
                onChange={setSelectedVariantId}
              />
            )}

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <label htmlFor="quantity" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Qty
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={qtyBtn}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span style={{ width: 40, textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  style={qtyBtn}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to cart */}
            {selectedVariant && (
              <AddToCartButton product={product} variant={selectedVariant} quantity={quantity} />
            )}

            {/* Description */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--space-4)' }}>
              <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
                Description
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {product.description}
              </p>
            </div>

            {/* Vendor */}
            <VendorLink vendor={product.vendor} />
          </div>
        </div>

        {/* Reviews */}
        <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--space-6)' }}>
          <h2 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            Customer Reviews
          </h2>
          <ReviewList productId={product.id} averageRating={product.rating} reviewCount={product.reviewCount} />
        </div>

        {/* Related */}
        <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--space-6)' }}>
          <RelatedProducts productId={product.id} />
        </div>
      </div>
    </div>
  );
};

const breadcrumbBtn: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--color-brand-primary)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)',
  padding: 0,
};

const qtyBtn: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--color-text-primary)',
  cursor: 'pointer', width: 32, height: 32,
  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const ProductDetailSkeleton: React.FC = () => (
  <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-6)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
      <Skeleton style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Skeleton width="80%" height={32} />
        <Skeleton width="40%" height={20} />
        <Skeleton width="30%" height={28} />
        <Skeleton height={80} />
        <Skeleton height={44} />
      </div>
    </div>
  </div>
);
