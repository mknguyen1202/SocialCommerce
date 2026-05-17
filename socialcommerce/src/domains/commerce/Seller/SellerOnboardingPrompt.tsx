import React, { useState } from 'react';
import { useApplyAsVendor } from '../hooks/useSellerShops';

export const SellerOnboardingPrompt: React.FC = () => {
  const apply = useApplyAsVendor();
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    await apply.mutateAsync();
    setApplied(true);
    // Reload page so auth context picks up new role
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-8)', gap: 'var(--space-4)', textAlign: 'center',
    }}>
      <span aria-hidden="true" style={{ fontSize: 64 }}>🏬</span>
      <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>
        Start selling on SocialCommerce
      </h2>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: 420, lineHeight: 1.6 }}>
        Create your shop, manage inventory, fulfil orders, and reach millions of customers — all in one place.
      </p>
      {applied ? (
        <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>
          ✓ Approved! Setting up your shop…
        </div>
      ) : (
        <button
          onClick={handleApply}
          disabled={apply.isPending}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--color-brand-primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-lg)',
            cursor: 'pointer', fontSize: 'var(--font-size-md)',
            fontWeight: 600, opacity: apply.isPending ? 0.7 : 1,
          }}
        >
          {apply.isPending ? 'Applying…' : 'Become a Seller — it\'s free'}
        </button>
      )}
    </div>
  );
};
