import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCampaign, usePauseCampaign, useResumeCampaign } from '../../hooks/useCampaigns';
import { LineChartCard } from '../../../../shared/components/charts/LineChartCard';

interface CampaignDetailProps {
  shopId: string | null;
  campaignId: string | null;
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: '#10b981', bg: '#10b98122' },
  PAUSED: { color: '#f59e0b', bg: '#f59e0b22' },
  ENDED: { color: '#6b7280', bg: '#6b728022' },
  DRAFT: { color: '#3b82f6', bg: '#3b82f622' },
};

const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;
const fmtNum = (v: number) => v.toLocaleString('en-US');
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const CampaignDetail: React.FC<CampaignDetailProps> = ({ shopId, campaignId }) => {
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useCampaign(shopId, campaignId);
  const pauseCampaign = usePauseCampaign(shopId!);
  const resumeCampaign = useResumeCampaign(shopId!);

  if (isLoading) return <div style={{ padding: 'var(--space-5)', color: 'var(--color-text-muted)' }}>Loading…</div>;
  if (!campaign) return <div style={{ padding: 'var(--space-5)', color: 'var(--color-text-muted)' }}>Campaign not found.</div>;

  const s = STATUS_STYLES[campaign.status] ?? STATUS_STYLES.DRAFT;
  const ctr = campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0;
  const cvr = campaign.clicks > 0 ? campaign.conversions / campaign.clicks : 0;
  const budgetUsed = campaign.budget > 0 ? campaign.spent / campaign.budget : 0;

  return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('../ads')} style={backBtnStyle}>← Campaigns</button>
        <h1 style={{ margin: 0, flex: 1, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>{campaign.name}</h1>
        <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'var(--font-size-sm)', color: s.color, background: s.bg }}>{campaign.status}</span>
        <Link to={`../ads/${campaign.id}/edit`} style={{ ...smallBtnStyle, textDecoration: 'none' }}>Edit</Link>
        {campaign.status === 'ACTIVE' && (
          <button onClick={() => pauseCampaign.mutateAsync(campaign.id)} style={{ ...smallBtnStyle, color: 'var(--color-warning)' }}>Pause</button>
        )}
        {campaign.status === 'PAUSED' && (
          <button onClick={() => resumeCampaign.mutateAsync(campaign.id)} style={{ ...smallBtnStyle, color: 'var(--color-success)' }}>Resume</button>
        )}
      </div>

      {/* Budget bar */}
      <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Budget: {fmtCurrency(campaign.spent)} spent of {fmtCurrency(campaign.budget)}</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: budgetUsed > 0.9 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
            {Math.round(budgetUsed * 100)}% used
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--color-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(budgetUsed * 100, 100)}%`, background: budgetUsed > 0.9 ? 'var(--color-danger)' : 'var(--color-brand-primary)', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 8, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          <span>Start: {fmtDate(campaign.startDate)}</span>
          {campaign.endDate && <span>End: {fmtDate(campaign.endDate)}</span>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
        {[
          { label: 'Impressions', value: fmtNum(campaign.impressions) },
          { label: 'Clicks', value: fmtNum(campaign.clicks) },
          { label: 'CTR', value: fmtPct(ctr) },
          { label: 'Conversions', value: fmtNum(campaign.conversions) },
          { label: 'CVR', value: fmtPct(cvr) },
          { label: 'ROAS', value: campaign.roas ? `${campaign.roas.toFixed(1)}x` : '—' },
          { label: 'Revenue', value: fmtCurrency(campaign.revenue ?? 0) },
          { label: 'CPC', value: campaign.clicks > 0 ? fmtCurrency(campaign.spent / campaign.clicks) : '—' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{kpi.label}</div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Performance over time */}
      {campaign.metricsHistory && campaign.metricsHistory.length > 0 && (
        <LineChartCard
          title="Performance over time"
          data={campaign.metricsHistory}
          series={[
            { key: 'impressions', label: 'Impressions', color: '#3b82f6' },
            { key: 'clicks', label: 'Clicks', color: '#10b981' },
            { key: 'conversions', label: 'Conversions', color: '#f59e0b' },
          ]}
          xKey="date"
          formatY={fmtNum}
          height={280}
        />
      )}
    </div>
  );
};

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: '4px 0',
};
const smallBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
};
