import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { useYears } from '../hooks/useYears.js';
import { expensesByCategory, getBudgetStatus, inPeriod, percentUsed, periodKey, previousPeriod, summarize } from '../lib/calculations.js';
import { TX_TYPE } from '../lib/constants.js';
import { formatIDR, formatPercent, monthLabel } from '../lib/format.js';
import PeriodSelector from '../components/ui/PeriodSelector.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States.jsx';
import BudgetRow from '../components/budget/BudgetRow.jsx';

export default function Budget() {
  const { categories, expenseBudgets, transactions, period, setPeriod, saveBudgets, removeBudget, status, error, reload } = useFinance();
  const years = useYears([period.year]);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);

  const key = periodKey(period.year, period.month);
  const summary = useMemo(() => summarize(transactions, expenseBudgets, period.year, period.month), [transactions, expenseBudgets, period]);
  const rowByCat = useMemo(() => Object.fromEntries(summary.budgetRows.map((r) => [r.kategori, r])), [summary]);
  const spendByCat = useMemo(
    () => Object.fromEntries(expensesByCategory(transactions.filter((t) => inPeriod(t.tanggal, period.year, period.month))).map((x) => [x.name, x.value])),
    [transactions, period],
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.tipe === TX_TYPE.EXPENSE && (c.aktif || rowByCat[c.nama])),
    [categories, rowByCat],
  );

  const prev = previousPeriod(period);
  const copyable = useMemo(() => {
    const prevKey = periodKey(prev.year, prev.month);
    const activeNames = new Set(categories.filter((c) => c.tipe === TX_TYPE.EXPENSE && c.aktif).map((c) => c.nama));
    return expenseBudgets.filter((b) => b.bulan === prevKey && !rowByCat[b.kategori] && activeNames.has(b.kategori));
  }, [expenseBudgets, categories, rowByCat, prev.year, prev.month]);

  const overall = getBudgetStatus(summary.totalBudget, summary.budgetedActual);
  const overallPercent = percentUsed(summary.totalBudget, summary.budgetedActual);

  const saveOne = (kategori, budget) => saveBudgets([{ bulan: key, kategori, budget }], 'Budget disimpan ke Google Sheets.');

  const copyFromPrevious = async () => {
    setCopying(true);
    try {
      await saveBudgets(copyable.map((b) => ({ bulan: key, kategori: b.kategori, budget: b.budget })), `${copyable.length} budget disalin dari ${monthLabel(prev.year, prev.month)}.`);
    } catch {
      // toast galat sudah tampil
    } finally {
      setCopying(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await removeBudget(key, toDelete);
      setToDelete(null);
    } catch {
      // toast galat sudah tampil
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="comic-title text-4xl sm:text-5xl">Budget</h1>
          <p className="mt-2 text-sm font-medium">Anggaran pengeluaran {monthLabel(period.year, period.month)}. Tabungan dipantau terpisah.</p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} years={years} />
      </div>

      {status === 'loading' && !categories.length ? <Spinner label="Mengambil data budget…" />
        : status === 'error' ? <ErrorState error={error} onRetry={reload} />
          : (
            <>
              <Card title="Ringkasan budget" subtitle={monthLabel(period.year, period.month)} tone="secondary">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div><p className="text-xs font-bold uppercase tracking-wider comic-muted">Total budget</p><p className="comic-display text-2xl">{formatIDR(summary.totalBudget)}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider comic-muted">Pengeluaran aktual</p><p className="comic-display text-2xl">{formatIDR(summary.budgetedActual)}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider comic-muted">Sisa budget</p><p className={`comic-display text-2xl ${summary.remainingBudget < 0 ? 'underline decoration-expense decoration-4' : ''}`}>{formatIDR(summary.remainingBudget)}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider comic-muted">Terpakai</p><p className="comic-display text-2xl">{summary.totalBudget > 0 ? formatPercent(overallPercent, 0) : '—'}</p></div>
                </div>
                {summary.totalBudget > 0 && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1"><ProgressBar percent={overallPercent} tone={overall.tone} /></div>
                    <StatusBadge status={overall} />
                  </div>
                )}
                {summary.unbudgetedExpenses > 0 && (
                  <p className="tone-primary mt-4 rounded-lg border-2 border-ink px-3 py-2 text-xs font-bold">
                    Pengeluaran {formatIDR(summary.unbudgetedExpenses)} pada kategori tanpa budget tidak dihitung dalam sisa budget.
                  </p>
                )}
              </Card>

              {copyable.length > 0 && (
                <div className="comic-card comic-card--flat tone-income flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <p className="text-sm font-bold">{copyable.length} kategori punya budget di {monthLabel(prev.year, prev.month)} tetapi belum bulan ini.</p>
                  <Button variant="primary" icon={Copy} loading={copying} onClick={copyFromPrevious}>Salin dari bulan lalu</Button>
                </div>
              )}

              <Card padded={false} title="Budget per kategori" subtitle="Hanya kategori Pengeluaran" tone="primary">
                {expenseCategories.length === 0 ? (
                  <EmptyState title="Belum ada kategori Pengeluaran" description="Tambahkan kategori Pengeluaran di halaman Pengaturan terlebih dahulu." />
                ) : (
                  <ul className="comic-divide">
                    {expenseCategories.map((c) => (
                      <BudgetRow
                        key={c.nama}
                        kategori={c.nama}
                        row={rowByCat[c.nama]}
                        unbudgetedActual={spendByCat[c.nama] || 0}
                        onSave={saveOne}
                        onDelete={setToDelete}
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus budget?"
          message={`Budget ${toDelete} untuk ${monthLabel(period.year, period.month)} akan dihapus dari Google Sheets. Transaksi tidak terpengaruh.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
