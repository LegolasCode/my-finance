// Warna grafik merujuk ke token CSS (src/styles/theme.css) sehingga ikut berubah saat tema diubah.
export const COLOR = {
  income: 'var(--c-income)',
  expense: 'var(--c-expense)',
  primary: 'var(--c-primary)',
  secondary: 'var(--c-secondary)',
  accent: 'var(--c-accent)',
  ink: 'var(--c-ink)',
};
export const PIE_COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--c-chart-${i})`);
export const BAR_STROKE = { stroke: 'var(--c-ink)', strokeWidth: 2 };
export const AXIS = { tickLine: false, axisLine: { stroke: 'var(--c-ink)', strokeWidth: 2 }, fontSize: 11 };
export const TOOLTIP = {
  contentStyle: {
    background: 'var(--c-surface)', border: '3px solid var(--c-ink)', borderRadius: 12,
    boxShadow: '4px 4px 0 var(--c-ink)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 10px',
  },
  itemStyle: { color: 'var(--c-ink)', fontWeight: 700 },
  labelStyle: { color: 'var(--c-ink)', fontWeight: 700, marginBottom: 4 },
  cursor: { fill: 'var(--c-soft)' },
};
