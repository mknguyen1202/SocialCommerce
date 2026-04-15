import React, { useState } from 'react';
import type { PaymentMethodSummary } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';

interface PaymentFormProps {
  onSubmit: (method: PaymentMethodSummary) => void;
  onBack: () => void;
}

const SAVED_METHODS: PaymentMethodSummary[] = [
  { id: 'card-1', type: 'card', label: 'Visa', last4: '4242' },
  { id: 'wallet-1', type: 'wallet', label: 'PayPal' },
];

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, onBack }) => {
  const [selectedId, setSelectedId] = useState<string>(SAVED_METHODS[0].id);
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const isNew = selectedId === 'new';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      onSubmit({ id: `new-${Date.now()}`, type: 'card', label: 'Visa', last4: cardNum.slice(-4) });
    } else {
      const method = SAVED_METHODS.find((m) => m.id === selectedId)!;
      onSubmit(method);
    }
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Saved methods */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {SAVED_METHODS.map((m) => (
          <PaymentOption
            key={m.id}
            id={m.id}
            label={m.last4 ? `${m.label} ending in ····${m.last4}` : m.label}
            icon={m.type === 'card' ? '💳' : '🏦'}
            selected={selectedId === m.id}
            onSelect={() => setSelectedId(m.id)}
          />
        ))}
        <PaymentOption
          id="new"
          label="Add new card"
          icon="➕"
          selected={isNew}
          onSelect={() => setSelectedId('new')}
        />
      </div>

      {/* New card fields */}
      {isNew && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <label htmlFor="nameOnCard" style={labelStyle}>Name on Card</label>
            <input id="nameOnCard" value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} placeholder="Jane Doe" style={fieldStyle} required />
          </div>
          <div>
            <label htmlFor="cardNum" style={labelStyle}>Card Number</label>
            <input
              id="cardNum"
              value={cardNum}
              onChange={(e) => setCardNum(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="1234 5678 9012 3456"
              maxLength={16}
              style={fieldStyle}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label htmlFor="expiry" style={labelStyle}>Expiry (MM/YY)</label>
              <input
                id="expiry"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="12/26"
                maxLength={5}
                style={fieldStyle}
                required
              />
            </div>
            <div>
              <label htmlFor="cvv" style={labelStyle}>CVV</label>
              <input
                id="cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                type="password"
                style={fieldStyle}
                required
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" type="button" onClick={onBack}>← Back</Button>
        <Button type="submit">Review Order →</Button>
      </div>
    </form>
  );
};

const PaymentOption: React.FC<{ id: string; label: string; icon: string; selected: boolean; onSelect: () => void }> = ({
  id: _id, label, icon, selected, onSelect,
}) => (
  <button
    type="button"
    onClick={onSelect}
    role="radio"
    aria-checked={selected}
    style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: selected ? 'rgba(var(--color-brand-rgb, 99,102,241),0.1)' : 'var(--color-surface-3)',
      border: `2px solid ${selected ? 'var(--color-brand-primary)' : 'transparent'}`,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      transition: 'border-color var(--transition-fast)',
    }}
  >
    <span style={{ fontSize: 20 }}>{icon}</span>
    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{label}</span>
    <span style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.2)'}`, background: selected ? 'var(--color-brand-primary)' : 'transparent', flexShrink: 0 }} />
  </button>
);

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-surface-3)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
  padding: 'var(--space-2) var(--space-3)', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};
