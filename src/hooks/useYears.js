import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext.jsx';

/** Daftar tahun untuk selector: tahun yang punya data, tahun berjalan, dan tahun terpilih. */
export function useYears(extra = []) {
  const { transactions, budgets } = useFinance();
  return useMemo(() => {
    const set = new Set([new Date().getFullYear(), ...extra.filter(Boolean)]);
    transactions.forEach((t) => { const y = Number(String(t.tanggal).slice(0, 4)); if (y) set.add(y); });
    budgets.forEach((b) => { const y = Number(String(b.bulan).slice(0, 4)); if (y) set.add(y); });
    return [...set].sort((a, b) => a - b);
  }, [transactions, budgets, extra]);
}
