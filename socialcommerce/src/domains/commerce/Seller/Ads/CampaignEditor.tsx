import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaign, useCreateCampaign, useUpdateCampaign } from '../../hooks/useCampaigns';

interface CampaignEditorProps {
  shopId: string | null;
  campaignId: string | null;
}

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Brand awareness — maximize reach' },
  { value: 'traffic', label: 'Traffic — drive clicks to products' },
  { value: 'conversions', label: 'Conversions — optimize for purchases' },
];

export const CampaignEditor: React.FC<CampaignEditorProps> = ({ shopId, campaignId }) => {
  const navigate = useNavigate();
  const isNew = !campaignId;
  const { data: existing } = useCampaign(shopId, campaignId);
  const createCampaign = useCreateCampaign(shopId!);
  const updateCampaign = useUpdateCampaign(shopId!, campaignId ?? '');

  const [form, setForm] = useState({
    name: '',
    objective: 'traffic',
    budget: 100,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    targetAudience: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        objective: existing.objective ?? 'traffic',
        budget: existing.budget,
        startDate: new Date(existing.startDate).toISOString().split('T')[0],
        endDate: existing.endDate ? new Date(existing.endDate).toISOString().split('T')[0] : '',
        targetAudience: existing.targetAudience ?? '',
      });
    }
  }, [existing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Campaign name is required.'); return; }
    if (form.budget <= 0) { setError('Budget must be greater than 0.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, endDate: form.endDate || undefined };
      if (isNew) {
        await createCampaign.mutateAsync(payload as never);
      } else {
        await updateCampaign.mutateAsync(payload as never);
      }
      navigate('../ads');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 640, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button type="button" onClick={() => navigate('../ads')} style={backBtnStyle}>← Campaigns</button>
        <h1 style={{ margin: 0, flex: 1, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>
          {isNew ? 'New Campaign' : 'Edit Campaign'}
        </h1>
        <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? 'Saving…' : isNew ? 'Create' : 'Save'}</button>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: '#b91c1c', fontSize: 'var(--font-size-sm)' }}>
          {error}
        </div>
      )}

      <Section title="Campaign details">
        <label style={labelStyle}>
          <span style={labelTextStyle}>Campaign name *</span>
          <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. Summer Sale 2025" />
        </label>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Objective</span>
          <select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} style={inputStyle}>
            {OBJECTIVE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Target audience (optional)</span>
          <input type="text" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} style={inputStyle} placeholder="e.g. tech enthusiasts 18–35" />
        </label>
      </Section>

      <Section title="Budget & schedule">
        <label style={labelStyle}>
          <span style={labelTextStyle}>Total budget ($) *</span>
          <input type="number" min={1} step={1} required value={form.budget} onChange={e => setForm(f => ({ ...f, budget: parseFloat(e.target.value) }))} style={inputStyle} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Start date *</span>
            <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>End date (optional)</span>
            <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inputStyle} />
          </label>
        </div>
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

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelTextStyle: React.CSSProperties = { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 };
const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)', background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: '4px 0',
};
