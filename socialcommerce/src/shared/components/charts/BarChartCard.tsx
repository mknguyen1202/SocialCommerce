import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, Cell,
} from 'recharts';

interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface BarChartCardProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  series: BarSeries[];
  xKey?: string;
  height?: number;
  horizontal?: boolean;
  formatY?: (v: number) => string;
  style?: React.CSSProperties;
}

export const BarChartCard: React.FC<BarChartCardProps> = ({
  title, data, series, xKey = 'label', height = 240, horizontal, formatY, style,
}) => (
  <div style={{
    background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', ...style,
  }}>
    <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
      {title}
    </h3>
    <div aria-label={`${title} chart`} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" horizontal={!horizontal} vertical={false} />
          {horizontal ? (
            <>
              <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={120} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={formatY} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={formatY} width={48} />
            </>
          )}
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)', borderRadius: 8, fontSize: 12 }}
            formatter={formatY ? (val: number) => [formatY(val)] : undefined}
          />
          {series.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => <Cell key={i} fill={s.color} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
