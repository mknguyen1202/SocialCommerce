import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommerceStore } from '../stores/commerceStore';
import { usePlaceOrder } from '../hooks/useOrders';
import { AddressForm } from './AddressForm';
import { PaymentForm } from './PaymentForm';
import { OrderReview } from './OrderReview';
import { OrderConfirmation } from './OrderConfirmation';
import type { Order } from '../../../shared/types/domain';

const STEPS = [
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
] as const;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart, checkoutStep, setCheckoutStep,
    shippingAddress, setShippingAddress,
    paymentMethod, setPaymentMethod,
    clearCart, setLastOrderId,
  } = useCommerceStore();

  const [placedOrder, setPlacedOrder] = React.useState<Order | null>(null);
  const [placeError, setPlaceError] = React.useState('');
  const placeOrder = usePlaceOrder();

  if (cart.itemCount === 0 && checkoutStep !== 'confirmation') {
    navigate('/commerce/cart');
    return null;
  }

  if (checkoutStep === 'confirmation' && placedOrder) {
    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <OrderConfirmation order={placedOrder} />
      </div>
    );
  }

  const activeStepIndex = STEPS.findIndex((s) => s.key === checkoutStep);

  const handlePlaceOrder = async () => {
    if (!shippingAddress || !paymentMethod) return;
    setPlaceError('');
    try {
      const order = await placeOrder.mutateAsync({
        items: cart.items.map((i) => ({ productId: i.product.id, variantId: i.variant.id, quantity: i.quantity })),
        shippingAddress,
        paymentMethodId: paymentMethod.id,
        couponCode: cart.couponCode,
      });
      setPlacedOrder(order);
      setLastOrderId(order.id);
      clearCart();
      setCheckoutStep('confirmation');
    } catch {
      setPlaceError('Payment failed. Please check your details and try again.');
    }
  };

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-6)' }}>
        {/* Step indicator */}
        <nav aria-label="Checkout steps" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          {STEPS.map((step, i) => (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i <= activeStepIndex ? 'var(--color-brand-primary)' : 'var(--color-surface-3)',
                  color: i <= activeStepIndex ? '#fff' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                  flexShrink: 0,
                }}>
                  {i < activeStepIndex ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)', color: i === activeStepIndex ? 'var(--color-text-primary)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < activeStepIndex ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.1)' }} />
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Step title */}
        <h1 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
          {checkoutStep === 'shipping' && 'Shipping Address'}
          {checkoutStep === 'payment' && 'Payment Method'}
          {checkoutStep === 'review' && 'Review Your Order'}
        </h1>

        {/* Step content */}
        {checkoutStep === 'shipping' && (
          <AddressForm
            initial={shippingAddress}
            onSubmit={(addr) => { setShippingAddress(addr); setCheckoutStep('payment'); }}
          />
        )}
        {checkoutStep === 'payment' && (
          <PaymentForm
            onSubmit={(pm) => { setPaymentMethod(pm); setCheckoutStep('review'); }}
            onBack={() => setCheckoutStep('shipping')}
          />
        )}
        {checkoutStep === 'review' && shippingAddress && paymentMethod && (
          <>
            {placeError && (
              <p role="alert" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', background: 'rgba(var(--color-danger-rgb,239,68,68),0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                {placeError}
              </p>
            )}
            <OrderReview
              cart={cart}
              address={shippingAddress}
              paymentMethod={paymentMethod}
              isPlacing={placeOrder.isPending}
              onPlace={handlePlaceOrder}
              onBack={() => setCheckoutStep('payment')}
            />
          </>
        )}
      </div>
    </div>
  );
};
