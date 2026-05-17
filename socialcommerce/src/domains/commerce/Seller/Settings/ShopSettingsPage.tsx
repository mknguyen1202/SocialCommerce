import React, { useEffect, useState } from 'react';
import { useShopSettings, useUpdateShopSettings } from '../../hooks/useShopSettings';

interface ShopSettingsPageProps {
  shopId: string | null;
}

export const ShopSettingsPage: React.FC<ShopSettingsPageProps> = ({ shopId }) => {
  const { data: settings, isLoading } = useShopSettings(shopId);
  const updateSettings = useUpdateShopSettings(shopId!);
  const activeShop = settings ?? null;

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    returnPolicy: '',
    shippingPolicy: '',
    notifyNewOrder: true,
    notifyNewMessage: true,
    notifyLowStock: true,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name,
        description: settings.description,
        slug: settings.slug,
        returnPolicy: settings.returnPolicy,
        shippingPolicy: settings.shippingPolicy,
        notifyNewOrder: settings.notifyNewOrder,
        notifyNewMessage: settings.notifyNewMessage,
        notifyLowStock: settings.notifyLowStock,
      });
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Shop name is required.'); return; }
    setError('');
    try {
      await updateSettings.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(String(err));
    }
  };

  if (isLoading) return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)' }} />)}
    </div>
  );

  return (
    <form onSubmit={handleSave} style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 700, height: '100%', overflowY: 'auto' }} aria-label="Shop settings">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Shop Settings</h1>
        <button type="submit" disabled={updateSettings.isPending} style={primaryBtnStyle}>
          {updateSettings.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: '#b91c1c', fontSize: 'var(--font-size-sm)' }}>
          {error}
        </div>
      )}

      {/* Basic info */}
      <Section title="Shop information">
        <Field label="Shop name" required>
          <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell customers about your shop…" />
        </Field>
        <Field label="Shop URL slug">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>socialcommerce.com/shop/</span>
            <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </Field>
      </Section>

      {/* Policies */}
      <Section title="Shop policies">
        <Field label="Return policy">
          <textarea value={form.returnPolicy} onChange={e => setForm(f => ({ ...f, returnPolicy: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe your return and refund policy…" />
        </Field>
        <Field label="Shipping policy">
          <textarea value={form.shippingPolicy} onChange={e => setForm(f => ({ ...f, shippingPolicy: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe shipping times, carriers, and costs…" />
        </Field>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {([
          ['notifyNewOrder', 'New order placed'],
          ['notifyNewMessage', 'New customer message'],
          ['notifyLowStock', 'Product low-stock alert'],
        ] as [keyof typeof form, string][]).map(([key, label]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={form[key] as boolean}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            {label}
          </label>
        ))}
      </Section>

      {/* Danger zone */}
      {activeShop && (
        <Section title="Danger zone">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>Close shop</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Permanently close "{activeShop.name}". All products will be archived.
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.alert('Shop closure would be confirmed in a separate step.')}
              style={{ padding: '8px 16px', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
            >
              Close Shop
            </button>
          </div>
        </Section>
      )}
    </form>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <legend style={{ padding: '0 var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{title}</legend>
    {children}
  </fieldset>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
      {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
    </span>
    {children}
  </label>
);

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', width: '100%', boxSizing: 'border-box',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};
