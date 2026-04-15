import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRelatedProducts } from '../hooks/useProducts';
import { ProductCard } from '../Browse/ProductCard';
import { Skeleton } from '../../../shared/components/Skeleton';

interface RelatedProductsProps {
  productId: string;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ productId }) => {
  const navigate = useNavigate();
  const { data: products, isLoading } = useRelatedProducts(productId);

  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section aria-label="Related products">
      <h2 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
        You Might Also Like
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 280, borderRadius: 'var(--radius-md)' }} />
            ))
          : products!.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/commerce/product/${product.id}`)}
              />
            ))}
      </div>
    </section>
  );
};
