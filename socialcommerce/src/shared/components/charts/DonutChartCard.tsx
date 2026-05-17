import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartCardProps {
  title: string;
  data: DonutSlice[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (v: number) => string;
  style?: React.CSSProperties;
}

export const DonutChartCard: React.FC<DonutChartCardProps> = ({
  title, data, height = 240, innerRadius = 60, outerRadius = 90, formatValue, style,
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
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="label"
            innerRadius={innerRadius} outerRadius={outerRadius}
            paddingAngle={2}
          >
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)', borderRadius: 8, fontSize: 12 }}
            formatter={formatValue ? (val: number) => [formatValue(val)] : undefined}
          />
          <Legend
            iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);
