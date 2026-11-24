import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatIDR } from '../../lib/format.js';
import { AXIS, BAR_STROKE, COLOR, TOOLTIP } from './chartTheme.js';

const NAMES = { budget: 'Budget', actual: 'Aktual' };

export default function BudgetActualChart({ rows }) {
  const data = rows.map((r) => ({ name: r.kategori, budget: r.budget, actual: r.actual, over: r.actual > r.budget }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" tickFormatter={formatCompact} {...AXIS} />
        <YAxis type="category" dataKey="name" width={112} {...AXIS} />
        <Tooltip {...TOOLTIP} formatter={(v, k) => [formatIDR(v), NAMES[k]]} />
        <Legend formatter={(k) => NAMES[k]} iconType="square" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
        <Bar dataKey="budget" fill={COLOR.secondary} {...BAR_STROKE} radius={[0, 4, 4, 0]} />
        <Bar dataKey="actual" {...BAR_STROKE} radius={[0, 4, 4, 0]}>
          {data.map((d) => <Cell key={d.name} fill={d.over ? COLOR.expense : COLOR.income} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
