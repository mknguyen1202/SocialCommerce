import { act } from '@testing-library/react';
import { useCommerceStore } from '../commerceStore';
import type { CartItem } from '../../../../shared/types/domain';

const INITIAL = useCommerceStore.getState();

afterEach(() => {
    act(() => useCommerceStore.setState(INITIAL));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(productId: string, variantId: string, qty: number, price: number): CartItem {
    return {
        product: {
            id: productId,
            vendorId: 'usr-6',
            vendor: { id: 'usr-6', name: 'Vendor', slug: 'vendor', avatarUrl: '', rating: 4.5 },
            title: `Product ${productId}`,
            description: '',
            price: { amount: price, currency: 'USD' },
            images: [],
            category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
            tags: [],
            variants: [],
            rating: 0,
            reviewCount: 0,
            availability: 'in_stock',
            createdAt: new Date(),
        },
        variant: {
            id: variantId,
            label: 'Default',
            sku: `SKU-${variantId}`,
            price: { amount: price, currency: 'USD' },
            stock: 10,
            attributes: {},
        },
        quantity: qty,
    };
}

// ─── addToCart ────────────────────────────────────────────────────────────────

describe('addToCart', () => {
    it('adds a new item to the cart', () => {
        act(() => useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 1, 50)));
        const { cart } = useCommerceStore.getState();
        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].product.id).toBe('prod-1');
        expect(cart.itemCount).toBe(1);
        expect(cart.subtotal.amount).toBe(50);
    });

    it('merges quantities when the same product+variant is added again', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 2, 50));
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 3, 50));
        });
        const { cart } = useCommerceStore.getState();
        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].quantity).toBe(5);
        expect(cart.itemCount).toBe(5);
        expect(cart.subtotal.amount).toBe(250);
    });

    it('appends a different product as a separate line item', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 1, 50));
            useCommerceStore.getState().addToCart(makeItem('prod-2', 'var-2a', 1, 30));
        });
        const { cart } = useCommerceStore.getState();
        expect(cart.items).toHaveLength(2);
        expect(cart.itemCount).toBe(2);
        expect(cart.subtotal.amount).toBe(80);
    });

    it('treats same product with different variant as a separate line item', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 1, 50));
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1b', 1, 50));
        });
        expect(useCommerceStore.getState().cart.items).toHaveLength(2);
    });
});

// ─── removeFromCart ───────────────────────────────────────────────────────────

describe('removeFromCart', () => {
    it('removes the matching item from the cart', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 2, 50));
            useCommerceStore.getState().removeFromCart('prod-1', 'var-1a');
        });
        expect(useCommerceStore.getState().cart.items).toHaveLength(0);
        expect(useCommerceStore.getState().cart.itemCount).toBe(0);
    });

    it('leaves unrelated items in the cart', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 1, 50));
            useCommerceStore.getState().addToCart(makeItem('prod-2', 'var-2a', 1, 30));
            useCommerceStore.getState().removeFromCart('prod-1', 'var-1a');
        });
        const { cart } = useCommerceStore.getState();
        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].product.id).toBe('prod-2');
    });
});

// ─── updateQuantity ───────────────────────────────────────────────────────────

describe('updateQuantity', () => {
    it('updates the quantity of an existing item', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 2, 50));
            useCommerceStore.getState().updateQuantity('prod-1', 'var-1a', 5);
        });
        expect(useCommerceStore.getState().cart.items[0].quantity).toBe(5);
        expect(useCommerceStore.getState().cart.itemCount).toBe(5);
        expect(useCommerceStore.getState().cart.subtotal.amount).toBe(250);
    });

    it('removes the item when quantity is set to 0', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 2, 50));
            useCommerceStore.getState().updateQuantity('prod-1', 'var-1a', 0);
        });
        expect(useCommerceStore.getState().cart.items).toHaveLength(0);
    });

    it('removes the item when quantity is set to a negative number', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 2, 50));
            useCommerceStore.getState().updateQuantity('prod-1', 'var-1a', -1);
        });
        expect(useCommerceStore.getState().cart.items).toHaveLength(0);
    });
});

// ─── clearCart ────────────────────────────────────────────────────────────────

describe('clearCart', () => {
    it('resets the cart to empty', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 3, 50));
            useCommerceStore.getState().clearCart();
        });
        const { cart } = useCommerceStore.getState();
        expect(cart.items).toHaveLength(0);
        expect(cart.itemCount).toBe(0);
        expect(cart.subtotal.amount).toBe(0);
    });
});

// ─── applyCoupon ──────────────────────────────────────────────────────────────

describe('applyCoupon', () => {
    it('applies a 10% discount stub for any coupon code', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 1, 100));
            useCommerceStore.getState().applyCoupon('SAVE10');
        });
        const { cart } = useCommerceStore.getState();
        expect(cart.couponCode).toBe('SAVE10');
        expect(cart.discount?.amount).toBe(10);
    });

    it('stores the coupon code on the cart', () => {
        act(() => {
            useCommerceStore.getState().addToCart(makeItem('prod-1', 'var-1a', 2, 50));
            useCommerceStore.getState().applyCoupon('PROMO');
        });
        expect(useCommerceStore.getState().cart.couponCode).toBe('PROMO');
    });
});

// ─── mini-cart panel ──────────────────────────────────────────────────────────

describe('mini-cart', () => {
    it('openMiniCart sets isMiniCartOpen to true', () => {
        act(() => useCommerceStore.getState().openMiniCart());
        expect(useCommerceStore.getState().isMiniCartOpen).toBe(true);
    });

    it('closeMiniCart sets isMiniCartOpen to false', () => {
        act(() => {
            useCommerceStore.getState().openMiniCart();
            useCommerceStore.getState().closeMiniCart();
        });
        expect(useCommerceStore.getState().isMiniCartOpen).toBe(false);
    });
});

// ─── checkout step ────────────────────────────────────────────────────────────

describe('setCheckoutStep', () => {
    it('starts at cart', () => {
        expect(useCommerceStore.getState().checkoutStep).toBe('cart');
    });

    it('advances to shipping', () => {
        act(() => useCommerceStore.getState().setCheckoutStep('shipping'));
        expect(useCommerceStore.getState().checkoutStep).toBe('shipping');
    });

    it('advances to payment', () => {
        act(() => useCommerceStore.getState().setCheckoutStep('payment'));
        expect(useCommerceStore.getState().checkoutStep).toBe('payment');
    });

    it('stores lastOrderId', () => {
        act(() => useCommerceStore.getState().setLastOrderId('ord-99'));
        expect(useCommerceStore.getState().lastOrderId).toBe('ord-99');
    });
});

// ─── filters ──────────────────────────────────────────────────────────────────

describe('product filters', () => {
    it('setFilters replaces all filters', () => {
        act(() => useCommerceStore.getState().setFilters({ q: 'headphones', minPrice: 50 }));
        expect(useCommerceStore.getState().filters).toEqual({ q: 'headphones', minPrice: 50 });
    });

    it('patchFilters merges into existing filters', () => {
        act(() => {
            useCommerceStore.getState().setFilters({ q: 'headphones', minPrice: 50 });
            useCommerceStore.getState().patchFilters({ maxPrice: 200 });
        });
        expect(useCommerceStore.getState().filters).toEqual({ q: 'headphones', minPrice: 50, maxPrice: 200 });
    });

    it('resetFilters clears all filters', () => {
        act(() => {
            useCommerceStore.getState().setFilters({ q: 'headphones', minPrice: 50 });
            useCommerceStore.getState().resetFilters();
        });
        expect(useCommerceStore.getState().filters).toEqual({});
    });
});
