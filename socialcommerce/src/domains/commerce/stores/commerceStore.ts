import { create } from 'zustand';
import type { Cart, CartItem, CheckoutStep, Address, PaymentMethodSummary, ProductFilters } from '../../../shared/types/domain';

interface CommerceState {
  // Cart (client-side optimistic)
  cart: Cart;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => void;

  // Mini-cart panel
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;

  // Checkout state
  checkoutStep: CheckoutStep;
  setCheckoutStep: (step: CheckoutStep) => void;
  shippingAddress: Address | null;
  setShippingAddress: (addr: Address) => void;
  paymentMethod: PaymentMethodSummary | null;
  setPaymentMethod: (pm: PaymentMethodSummary) => void;
  lastOrderId: string | null;
  setLastOrderId: (id: string) => void;

  // Browse filters
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  patchFilters: (partial: Partial<ProductFilters>) => void;
  resetFilters: () => void;
}

const EMPTY_CART: Cart = {
  items: [],
  subtotal: { amount: 0, currency: 'USD' },
  itemCount: 0,
};

function recalcCart(items: CartItem[], couponCode?: string, discount?: Cart['discount']): Cart {
  const subtotal = items.reduce(
    (sum, item) => sum + item.variant.price.amount * item.quantity,
    0
  );
  const currency = items[0]?.variant.price.currency ?? 'USD';
  return {
    items,
    subtotal: { amount: subtotal, currency },
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    couponCode,
    discount,
  };
}

export const useCommerceStore = create<CommerceState>((set, get) => ({
  cart: EMPTY_CART,

  addToCart: (newItem) => {
    const { cart } = get();
    const existing = cart.items.find(
      (i) => i.product.id === newItem.product.id && i.variant.id === newItem.variant.id
    );
    const items = existing
      ? cart.items.map((i) =>
          i.product.id === newItem.product.id && i.variant.id === newItem.variant.id
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        )
      : [...cart.items, newItem];
    set({ cart: recalcCart(items, cart.couponCode, cart.discount) });
  },

  removeFromCart: (productId, variantId) => {
    const { cart } = get();
    const items = cart.items.filter(
      (i) => !(i.product.id === productId && i.variant.id === variantId)
    );
    set({ cart: recalcCart(items, cart.couponCode, cart.discount) });
  },

  updateQuantity: (productId, variantId, quantity) => {
    const { cart } = get();
    const items =
      quantity <= 0
        ? cart.items.filter(
            (i) => !(i.product.id === productId && i.variant.id === variantId)
          )
        : cart.items.map((i) =>
            i.product.id === productId && i.variant.id === variantId
              ? { ...i, quantity }
              : i
          );
    set({ cart: recalcCart(items, cart.couponCode, cart.discount) });
  },

  clearCart: () => set({ cart: EMPTY_CART }),

  applyCoupon: (code) => {
    const { cart } = get();
    // Stub: 10% discount for any coupon code
    const discount = code
      ? { amount: cart.subtotal.amount * 0.1, currency: cart.subtotal.currency }
      : undefined;
    set({ cart: { ...cart, couponCode: code || undefined, discount } });
  },

  isMiniCartOpen: false,
  openMiniCart: () => set({ isMiniCartOpen: true }),
  closeMiniCart: () => set({ isMiniCartOpen: false }),

  checkoutStep: 'cart',
  setCheckoutStep: (step) => set({ checkoutStep: step }),
  shippingAddress: null,
  setShippingAddress: (addr) => set({ shippingAddress: addr }),
  paymentMethod: null,
  setPaymentMethod: (pm) => set({ paymentMethod: pm }),
  lastOrderId: null,
  setLastOrderId: (id) => set({ lastOrderId: id }),

  filters: {},
  setFilters: (filters) => set({ filters }),
  patchFilters: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),
  resetFilters: () => set({ filters: {} }),
}));
