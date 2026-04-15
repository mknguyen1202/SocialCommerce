import React from 'react';
import type { Product, ProductVariant } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';
import { useCommerceStore } from '../stores/commerceStore';

interface AddToCartButtonProps {
  product: Product;
  variant: ProductVariant;
  quantity?: number;
  onAdded?: () => void;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  variant,
  quantity = 1,
  onAdded,
}) => {
  const { addToCart, openMiniCart } = useCommerceStore();
  const isOutOfStock = variant.stock === 0 || product.availability === 'out_of_stock';

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart({ product, variant, quantity });
    openMiniCart();
    onAdded?.();
  };

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={handleAdd}
      disabled={isOutOfStock}
      style={{ width: '100%' }}
      aria-label={isOutOfStock ? 'Out of stock' : `Add ${product.title} to cart`}
    >
      {isOutOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
    </Button>
  );
};
