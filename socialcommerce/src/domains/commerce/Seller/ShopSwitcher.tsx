import React, { useState } from 'react';
import { useSellerShops } from '../hooks/useSellerShops';
import { useSellerStore } from '../stores/sellerStore';
import { useCreateShop } from '../hooks/useSellerShops';

export const ShopSwitcher: React.FC = () => {
  const { data: shops } = useSellerShops();
  const { activeShopId, setActiveShopId } = useSellerStore();
  const createShop = useCreateShop();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const activeShop = shops?.find(s => s.id === activeShopId) ?? shops?.[0];

  if (!shops || shops.length === 0) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await createShop.mutateAsync({ name: newName.trim(), slug, description: '' });
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer', width: '100%',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
        }}
      >
        {activeShop?.logoUrl && (
          <img src={activeShop.logoUrl} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
        )}
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeShop?.name ?? 'Select shop'}
        </span>
        <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Your shops"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}
        >
          {shops.map(shop => (
            <button
              key={shop.id}
              role="option"
              aria-selected={shop.id === activeShopId}
              onClick={() => { setActiveShopId(shop.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                background: shop.id === activeShopId ? 'var(--color-surface-3)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
              }}
            >
              {shop.logoUrl && <img src={shop.logoUrl} alt="" width={18} height={18} style={{ borderRadius: 3 }} />}
              <span style={{ flex: 1 }}>{shop.name}</span>
              {shop.id === activeShopId && <span style={{ fontSize: 12, color: 'var(--color-brand-primary)' }}>✓</span>}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--color-border-default)', padding: 'var(--space-2)' }}>
            {creating ? (
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                  placeholder="Shop name…"
                  style={{
                    flex: 1, padding: '4px 8px', border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)',
                    color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
                  }}
                />
                <button onClick={handleCreate} disabled={createShop.isPending}
                  style={{ padding: '4px 8px', background: 'var(--color-brand-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                  {createShop.isPending ? '…' : 'Create'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{
                  width: '100%', padding: '6px 8px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-brand-primary)',
                }}
              >
                + Create new shop
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
