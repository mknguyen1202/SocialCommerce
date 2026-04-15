import React, { useState } from 'react';
import type { Address } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';

interface AddressFormProps {
  initial?: Address | null;
  onSubmit: (address: Address) => void;
}

const COUNTRIES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'];

export const AddressForm: React.FC<AddressFormProps> = ({ initial, onSubmit }) => {
  const [form, setForm] = useState<Omit<Address, 'id'>>({
    fullName: initial?.fullName ?? '',
    line1: initial?.line1 ?? '',
    line2: initial?.line2 ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    postalCode: initial?.postalCode ?? '',
    country: initial?.country ?? 'US',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required.';
    if (!form.line1.trim()) e.line1 = 'Address line 1 is required.';
    if (!form.city.trim()) e.city = 'City is required.';
    if (!form.state.trim()) e.state = 'State / province is required.';
    if (!form.postalCode.trim()) e.postalCode = 'Postal code is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, id: initial?.id });
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Field label="Full Name *" id="fullName" value={form.fullName} onChange={(v) => set('fullName', v)} error={errors.fullName} placeholder="Jane Doe" />
      <Field label="Address Line 1 *" id="line1" value={form.line1} onChange={(v) => set('line1', v)} error={errors.line1} placeholder="123 Main St" />
      <Field label="Address Line 2" id="line2" value={form.line2 ?? ''} onChange={(v) => set('line2', v)} placeholder="Apt 4B (optional)" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <Field label="City *" id="city" value={form.city} onChange={(v) => set('city', v)} error={errors.city} placeholder="New York" />
        <Field label="State / Province *" id="state" value={form.state} onChange={(v) => set('state', v)} error={errors.state} placeholder="NY" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <Field label="Postal Code *" id="postalCode" value={form.postalCode} onChange={(v) => set('postalCode', v)} error={errors.postalCode} placeholder="10001" />
        <div>
          <label htmlFor="country" style={labelStyle}>Country *</label>
          <select
            id="country"
            value={form.country}
            onChange={(e) => set('country', e.target.value)}
            style={fieldStyle}
          >
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <Button type="submit" style={{ alignSelf: 'flex-end', marginTop: 'var(--space-2)' }}>
        Continue to Payment →
      </Button>
    </form>
  );
};

const Field: React.FC<{
  label: string; id: string; value: string;
  onChange: (v: string) => void; error?: string; placeholder?: string;
}> = ({ label, id, value, onChange, error, placeholder }) => (
  <div>
    <label htmlFor={id} style={labelStyle}>{label}</label>
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-err` : undefined}
      style={{ ...fieldStyle, borderColor: error ? 'var(--color-danger)' : undefined }}
    />
    {error && <p id={`${id}-err`} role="alert" style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>{error}</p>}
  </div>
);

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-surface-2)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
  padding: 'var(--space-2) var(--space-3)', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};
