import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatIDR } from '../../lib/format.js';
import { AXIS, COLOR, TOOLTIP } from './chartTheme.js';

export default function SavingsTrendChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis tickFormatter={formatCompact} {...AXIS} width={48} />
        <Tooltip {...TOOLTIP} formatter={(v) => [formatIDR(v), 'Tabungan']} />
        <Area type="monotone" dataKey="savings" stroke={COLOR.ink} strokeWidth={3} fill={COLOR.secondary} fillOpacity={0.7}
          dot={{ r: 4, stroke: 'var(--c-ink)', strokeWidth: 2, fill: 'var(--c-primary)' }} activeDot={{ r: 6, stroke: 'var(--c-ink)', strokeWidth: 3, fill: 'var(--c-primary)' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
