import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSellerProduct, useCreateProduct, useUpdateProduct } from '../../hooks/useSellerProducts';
import type { ProductStatus, ProductVariant } from '../types';

interface ProductEditorPageProps {
  shopId: string | null;
  productId: string | null;
}

const STATUSES: ProductStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK'];

const emptyVariant = (): ProductVariant => ({
  id: `v-${Date.now()}`,
  label: '',
  sku: '',
  price: 0,
  stock: 0,
  lowStockThreshold: 5,
  attributes: {},
});

export const ProductEditorPage: React.FC<ProductEditorPageProps> = ({ shopId, productId }) => {
  const navigate = useNavigate();
  const isNew = !productId;
  const { data: existing, isLoading } = useSellerProduct(shopId, productId);
  const createProduct = useCreateProduct(shopId!);
  const updateProduct = useUpdateProduct(shopId!, productId ?? '');

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    status: 'DRAFT' as ProductStatus,
    tags: '',
    seoTitle: '',
    seoDescription: '',
  });
  const [variants, setVariants] = useState<ProductVariant[]>([emptyVariant()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        category: existing.category,
        status: existing.status,
        tags: existing.tags.join(', '),
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
      });
      setVariants(existing.variants);
    }
  }, [existing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Product title is required.'); return; }
    if (variants.some(v => !v.sku.trim())) { setError('All variants must have a SKU.'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        variants,
      };
      if (isNew) {
        await createProduct.mutateAsync(payload as never);
      } else {
        await updateProduct.mutateAsync(payload as never);
      }
      navigate('../inventory');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const setVariantField = <K extends keyof ProductVariant>(index: number, field: K, value: ProductVariant[K]) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  if (!isNew && isLoading) return <LoadingSkeleton />;

  return (
    <form onSubmit={handleSave} style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 860, height: '100%', overflowY: 'auto' }} aria-label={isNew ? 'Create product' : 'Edit product'}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button type="button" onClick={() => navigate('../inventory')} style={backBtnStyle} aria-label="Back to inventory">← Back</button>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)', flex: 1 }}>
          {isNew ? 'New Product' : 'Edit Product'}
        </h1>
        <select
          aria-label="Product status"
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value as ProductStatus }))}
          style={selectStyle}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" disabled={saving} style={primaryBtnStyle}>
          {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: '#b91c1c', fontSize: 'var(--font-size-sm)' }}>
          {error}
        </div>
      )}

      {/* Basic info */}
      <Section title="Basic information">
        <Field label="Product title" required>
          <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. Wireless Earbuds Pro" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} placeholder="Describe your product…" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Field label="Category">
            <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle} placeholder="e.g. Electronics" />
          </Field>
          <Field label="Tags (comma-separated)">
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="wireless, audio, premium" />
          </Field>
        </div>
      </Section>

      {/* Variants */}
      <Section title={`Variants (${variants.length})`}>
        {variants.map((variant, i) => (
          <div key={variant.id} style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Variant {i + 1}
              </span>
              {variants.length > 1 && (
                <button type="button" onClick={() => setVariants(v => v.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 13 }}>
                  ✕ Remove
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-2)', alignItems: 'end' }}>
              <Field label="Label" noMargin>
                <input type="text" required value={variant.label} onChange={e => setVariantField(i, 'label', e.target.value)} style={inputStyle} placeholder="e.g. Black / L" />
              </Field>
              <Field label="SKU" noMargin>
                <input type="text" required value={variant.sku} onChange={e => setVariantField(i, 'sku', e.target.value)} style={inputStyle} placeholder="SKU-001" />
              </Field>
              <Field label="Price ($)" noMargin>
                <input type="number" min={0} step={0.01} required value={variant.price} onChange={e => setVariantField(i, 'price', parseFloat(e.target.value))} style={inputStyle} />
              </Field>
              <Field label="Stock" noMargin>
                <input type="number" min={0} required value={variant.stock} onChange={e => setVariantField(i, 'stock', parseInt(e.target.value, 10))} style={inputStyle} />
              </Field>
              <Field label="Low-stock threshold" noMargin>
                <input type="number" min={0} value={variant.lowStockThreshold} onChange={e => setVariantField(i, 'lowStockThreshold', parseInt(e.target.value, 10))} style={inputStyle} />
              </Field>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setVariants(v => [...v, emptyVariant()])} style={secondaryBtnStyle}>
          + Add Variant
        </button>
      </Section>

      {/* SEO */}
      <Section title="SEO">
        <Field label="SEO title">
          <input type="text" value={form.seoTitle} onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))} style={inputStyle} placeholder="Defaults to product title" />
        </Field>
        <Field label="SEO description">
          <textarea value={form.seoDescription} onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} placeholder="Brief summary for search engines…" />
        </Field>
      </Section>
    </form>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <legend style={{ padding: '0 var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{title}</legend>
    {children}
  </fieldset>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode; noMargin?: boolean }> = ({ label, required, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
      {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
    </span>
    {children}
  </label>
);

const LoadingSkeleton = () => (
  <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} style={{ height: 100, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)' }} />
    ))}
  </div>
);

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', width: '100%', boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = {
  padding: '6px 12px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};
const secondaryBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-start', padding: 'var(--space-2) var(--space-3)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)',
};
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)',
  padding: '4px 0',
};
