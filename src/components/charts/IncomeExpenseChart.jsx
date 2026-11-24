import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatIDR } from '../../lib/format.js';
import { AXIS, BAR_STROKE, COLOR, TOOLTIP } from './chartTheme.js';

const NAMES = { income: 'Pemasukan', expenses: 'Pengeluaran' };

export default function IncomeExpenseChart({ series, selectedMonth }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis tickFormatter={formatCompact} {...AXIS} width={48} />
        <Tooltip {...TOOLTIP} formatter={(v, k) => [formatIDR(v), NAMES[k]]} />
        <Legend formatter={(k) => NAMES[k]} iconType="square" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
        <Bar dataKey="income" fill={COLOR.income} {...BAR_STROKE} radius={[4, 4, 0, 0]}>
          {series.map((d) => <Cell key={d.month} fillOpacity={d.month === selectedMonth ? 1 : 0.5} strokeOpacity={d.month === selectedMonth ? 1 : 0.5} />)}
        </Bar>
        <Bar dataKey="expenses" fill={COLOR.expense} {...BAR_STROKE} radius={[4, 4, 0, 0]}>
          {series.map((d) => <Cell key={d.month} fillOpacity={d.month === selectedMonth ? 1 : 0.5} strokeOpacity={d.month === selectedMonth ? 1 : 0.5} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
