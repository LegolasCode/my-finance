import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatIDR, formatPercent } from '../../lib/format.js';
import { PIE_COLORS, TOOLTIP } from './chartTheme.js';

export default function ExpensePieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
      <div className="h-44 sm:h-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="92%" paddingAngle={0} stroke="var(--c-ink)" strokeWidth={3}>
              {data.map((d, i) => <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip {...TOOLTIP} formatter={(v, n) => [formatIDR(v), n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto text-xs sm:pr-1">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-sm border-2 border-ink" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="truncate font-bold">{d.name}</span>
            </span>
            <span className="comic-num shrink-0">{formatPercent((d.value / total) * 100, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
