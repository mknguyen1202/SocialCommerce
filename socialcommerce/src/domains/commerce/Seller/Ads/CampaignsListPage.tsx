import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaigns, usePauseCampaign, useResumeCampaign } from '../../hooks/useCampaigns';
import type { CampaignStatus } from '../types';

interface CampaignsListPageProps {
  shopId: string | null;
}

const STATUS_STYLES: Record<CampaignStatus, { color: string; bg: string; label: string }> = {
  ACTIVE: { color: '#10b981', bg: '#10b98122', label: 'Active' },
  PAUSED: { color: '#f59e0b', bg: '#f59e0b22', label: 'Paused' },
  ENDED: { color: '#6b7280', bg: '#6b728022', label: 'Ended' },
  DRAFT: { color: '#3b82f6', bg: '#3b82f622', label: 'Draft' },
  BUDGET_EXHAUSTED: { color: '#ef4444', bg: '#ef444422', label: 'Budget Exhausted' },
};

const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtNum = (v: number) => v.toLocaleString('en-US');

export const CampaignsListPage: React.FC<CampaignsListPageProps> = ({ shopId }) => {
  const { data: campaigns, isLoading } = useCampaigns(shopId);
  const pauseCampaign = usePauseCampaign(shopId!);
  const resumeCampaign = useResumeCampaign(shopId!);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');

  const filtered = campaigns?.filter(c => !statusFilter || c.status === statusFilter) ?? [];

  // Summary KPIs
  const activeCampaigns = campaigns?.filter(c => c.status === 'ACTIVE') ?? [];
  const totalSpend = campaigns?.reduce((s, c) => s + c.spent, 0) ?? 0;
  const totalImpressions = campaigns?.reduce((s, c) => s + c.impressions, 0) ?? 0;
  const totalClicks = campaigns?.reduce((s, c) => s + c.clicks, 0) ?? 0;
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', height: '100%', overflowY: 'auto' }} role="main" aria-label="Ad campaigns">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Campaigns</h1>
        <Link to="/commerce/seller/ads/new" style={{ ...primaryBtnStyle, textDecoration: 'none' }}>+ New Campaign</Link>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        {[
          { label: 'Active campaigns', value: activeCampaigns.length, icon: '📣' },
          { label: 'Total spend', value: fmtCurrency(totalSpend), icon: '💸' },
          { label: 'Impressions', value: fmtNum(totalImpressions), icon: '👁️' },
          { label: 'Clicks', value: fmtNum(totalClicks), icon: '🖱️' },
          { label: 'Avg CTR', value: fmtPct(avgCtr), icon: '🎯' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{kpi.label}</span>
              <span aria-hidden="true">{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['', 'ACTIVE', 'PAUSED', 'DRAFT', 'ENDED'] as (CampaignStatus | ''  )[]).map(s => (
          <button
            key={s}
            aria-pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '4px 12px', border: `1px solid ${statusFilter === s ? 'var(--color-brand-primary)' : 'var(--color-border-default)'}`,
              borderRadius: 'var(--radius-full)', background: statusFilter === s ? 'var(--color-brand-primary)' : 'transparent',
              color: statusFilter === s ? '#fff' : 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)', cursor: 'pointer',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Campaigns grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 160, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
          <p>No campaigns found. <Link to="/commerce/seller/ads/new" style={{ color: 'var(--color-brand-primary)' }}>Create one</Link> to start promoting your products.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
          {filtered.map(campaign => {
            const s = STATUS_STYLES[campaign.status];
            const ctr = campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0;
            const budgetUsed = campaign.totalBudget > 0 ? campaign.spent / campaign.totalBudget : 0;
            return (
              <div key={campaign.id} style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {fmtDate(campaign.startDate)} – {campaign.endDate ? fmtDate(campaign.endDate) : 'No end'}
                    </div>
                  </div>
                  <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, marginLeft: 8, flexShrink: 0 }}>
                    {s.label}
                  </span>
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Impressions', value: fmtNum(campaign.impressions) },
                    { label: 'Clicks', value: fmtNum(campaign.clicks) },
                    { label: 'CTR', value: fmtPct(ctr) },
                    { label: 'Spent', value: fmtCurrency(campaign.spent) },
                    { label: 'Budget', value: fmtCurrency(campaign.totalBudget) },
                    { label: 'CPC', value: campaign.cpc > 0 ? fmtCurrency(campaign.cpc) : '—' },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{m.label}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Budget progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>Budget used</span>
                    <span>{Math.round(budgetUsed * 100)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(budgetUsed * 100, 100)}%`, background: budgetUsed > 0.9 ? 'var(--color-danger)' : 'var(--color-brand-primary)', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                  <Link to={`../ads/${campaign.id}`} style={{ ...smallBtnStyle, textDecoration: 'none' }}>Details</Link>
                  <Link to={`../ads/${campaign.id}/edit`} style={{ ...smallBtnStyle, textDecoration: 'none' }}>Edit</Link>
                  {campaign.status === 'ACTIVE' && (
                    <button onClick={() => pauseCampaign.mutateAsync(campaign.id)} style={{ ...smallBtnStyle, color: 'var(--color-warning)' }}>Pause</button>
                  )}
                  {campaign.status === 'PAUSED' && (
                    <button onClick={() => resumeCampaign.mutateAsync(campaign.id)} style={{ ...smallBtnStyle, color: 'var(--color-success)' }}>Resume</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: 'var(--space-2) var(--space-4)',
  background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};
const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: 'transparent', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-secondary)',
};
