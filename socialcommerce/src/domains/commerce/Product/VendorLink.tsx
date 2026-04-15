import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { VendorSummary } from '../../../shared/types/domain';
import { Avatar } from '../../../shared/components/Avatar';

interface VendorLinkProps {
  vendor: VendorSummary;
}

export const VendorLink: React.FC<VendorLinkProps> = ({ vendor }) => {
  const navigate = useNavigate();
  const stars = '★'.repeat(Math.round(vendor.rating)) + '☆'.repeat(5 - Math.round(vendor.rating));

  return (
    <button
      onClick={() => navigate(`/commerce/shop/${vendor.slug}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        background: 'var(--color-surface-3)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'background var(--transition-fast)',
      }}
      aria-label={`Visit ${vendor.name}'s shop`}
    >
      <Avatar src={vendor.avatarUrl} name={vendor.name} size="lg" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
          {vendor.name}
        </p>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: '#f5c518' }}>
          {stars} <span style={{ color: 'var(--color-text-muted)' }}>Seller</span>
        </p>
      </div>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>›</span>
    </button>
  );
};
