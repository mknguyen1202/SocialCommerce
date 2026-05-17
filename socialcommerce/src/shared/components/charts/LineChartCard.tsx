import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend,
} from 'recharts';

interface Series {
  key: string;
  label: string;
  color: string;
}

interface LineChartCardProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  series: Series[];
  xKey?: string;
  height?: number;
  formatY?: (v: number) => string;
  style?: React.CSSProperties;
}

export const LineChartCard: React.FC<LineChartCardProps> = ({
  title, data, series, xKey = 'date', height = 240, formatY, style,
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
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
            tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
            tickFormatter={formatY} width={48} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-default)', borderRadius: 8, fontSize: 12 }}
            formatter={formatY ? (val: number) => [formatY(val)] : undefined}
          />
          {series.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
              stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
    {/* Accessible data table */}
    <table aria-label={`${title} data`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
      <thead><tr><th>{xKey}</th>{series.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead>
      <tbody>{data.map((row, i) => (
        <tr key={i}><td>{row[xKey]}</td>{series.map(s => <td key={s.key}>{row[s.key]}</td>)}</tr>
      ))}</tbody>
    </table>
  </div>
);
