import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Percent, PiggyBank, RefreshCw, Target, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { useYears } from '../hooks/useYears.js';
import { monthlySeries, summarize } from '../lib/calculations.js';
import { formatIDR, formatPercent, monthLabel } from '../lib/format.js';
import PeriodSelector from '../components/ui/PeriodSelector.jsx';
import SummaryCard from '../components/ui/SummaryCard.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { ErrorState, Spinner } from '../components/ui/States.jsx';
import ChartCard from '../components/charts/ChartCard.jsx';
import ExpensePieChart from '../components/charts/ExpensePieChart.jsx';
import IncomeExpenseChart from '../components/charts/IncomeExpenseChart.jsx';
import BudgetActualChart from '../components/charts/BudgetActualChart.jsx';
import SavingsTrendChart from '../components/charts/SavingsTrendChart.jsx';

export default function Dashboard() {
  const { transactions, expenseBudgets, period, setPeriod, status, error, reload } = useFinance();
  const years = useYears([period.year]);

  const summary = useMemo(() => summarize(transactions, expenseBudgets, period.year, period.month), [transactions, expenseBudgets, period]);
  const series = useMemo(() => monthlySeries(transactions, period.year), [transactions, period.year]);
  const alerts = summary.budgetRows.filter((r) => r.status.key !== 'aman').sort((a, b) => b.percent - a.percent);

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="comic-title text-4xl sm:text-5xl">Dashboard</h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-wider">Periode: {monthLabel(period.year, period.month)}</p>
      </div>
      <div className="flex items-center gap-2">
        <PeriodSelector period={period} onChange={setPeriod} years={years} />
        <Button variant="sky" onClick={reload} loading={status === 'loading'} icon={RefreshCw} className="hidden sm:inline-flex">Muat ulang</Button>
      </div>
    </div>
  );

  if (status === 'loading' && !transactions.length) return <div className="space-y-6">{header}<Spinner label="Mengambil data dari Google Sheets…" /></div>;
  if (status === 'error') return <div className="space-y-6">{header}<ErrorState error={error} onRetry={reload} /></div>;

  const noData = summary.count === 0 && summary.budgetRows.length === 0;

  return (
    <div className="space-y-6">
      {header}

      {noData && (
        <div className="comic-card comic-card--flat tone-surface flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="comic-display text-xl uppercase">Belum ada data pada {monthLabel(period.year, period.month)}</p>
            <p className="text-sm font-medium comic-muted">Catat transaksi pertama atau pilih periode lain.</p>
          </div>
          <Link to="/transaksi" className="comic-btn comic-btn--primary">Tambah transaksi</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard hero title="Saldo Akhir" value={formatIDR(summary.balance)} icon={Wallet} tone={summary.balance < 0 ? 'expense' : 'primary'} caption={summary.balance < 0 ? 'Saldo minus! Pengeluaran + tabungan melebihi pemasukan' : 'Pemasukan − pengeluaran − tabungan'} />
        <SummaryCard title="Total Pemasukan" value={formatIDR(summary.income)} icon={ArrowUpCircle} tone="income" caption={`${summary.count} transaksi bulan ini`} />
        <SummaryCard title="Total Pengeluaran" value={formatIDR(summary.expenses)} icon={ArrowDownCircle} tone="expense" />
        <SummaryCard title="Total Tabungan" value={formatIDR(summary.savings)} icon={PiggyBank} tone="secondary" />
        <SummaryCard title="Saving Rate" value={formatPercent(summary.savingRate)} icon={Percent} tone="accent" caption="Tabungan ÷ pemasukan" />
        <SummaryCard
          title="Sisa Budget"
          value={formatIDR(summary.remainingBudget)}
          icon={Target}
          tone={summary.remainingBudget < 0 ? 'expense' : 'surface'}
          caption={summary.totalBudget > 0 ? `dari total budget ${formatIDR(summary.totalBudget)}` : 'Belum ada budget bulan ini'}
        />
      </div>

      {alerts.length > 0 && (
        <Card title="Peringatan budget!" subtitle="Kategori yang hampir atau sudah melewati budget" tone="expense">
          <ul className="space-y-4">
            {alerts.map((r) => (
              <li key={r.kategori}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <AlertTriangle className="h-4 w-4" /> {r.kategori}
                  </span>
                  <span className="flex items-center gap-2"><span className="comic-num text-xs">{formatPercent(r.percent, 0)}</span><StatusBadge status={r.status} /></span>
                </div>
                <ProgressBar percent={r.percent} tone={r.status.tone} />
                <p className="comic-num mt-1.5 text-xs">
                  {formatIDR(r.actual)} dari {formatIDR(r.budget)}
                  {r.remaining < 0 ? ` · melebihi ${formatIDR(-r.remaining)}` : ` · sisa ${formatIDR(r.remaining)}`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.unbudgetedExpenses > 0 && (
        <p className="comic-card comic-card--flat tone-primary px-4 py-3 text-xs font-bold">
          Ada pengeluaran {formatIDR(summary.unbudgetedExpenses)} pada kategori yang belum punya budget bulan ini, jadi tidak dihitung dalam Sisa Budget.{' '}
          <Link to="/budget" className="comic-link">Atur budget</Link>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Pengeluaran per Kategori" tone="expense" subtitle={monthLabel(period.year, period.month)} isEmpty={summary.expensesByCategory.length === 0} height="h-72 sm:h-64">
          <ExpensePieChart data={summary.expensesByCategory} />
        </ChartCard>
        <ChartCard title="Pemasukan vs Pengeluaran" tone="income" subtitle={`Per bulan, tahun ${period.year}`} isEmpty={series.every((s) => !s.income && !s.expenses)} emptyText={`Belum ada transaksi di tahun ${period.year}.`}>
          <IncomeExpenseChart series={series} selectedMonth={period.month} />
        </ChartCard>
        <ChartCard title="Budget vs Pengeluaran Aktual" tone="primary" subtitle={monthLabel(period.year, period.month)} isEmpty={summary.budgetRows.length === 0} emptyText="Belum ada budget pada periode ini." height="h-72">
          <BudgetActualChart rows={summary.budgetRows} />
        </ChartCard>
        <ChartCard title="Tren Tabungan Bulanan" tone="secondary" subtitle={`Tahun ${period.year}`} isEmpty={series.every((s) => !s.savings)} emptyText={`Belum ada tabungan di tahun ${period.year}.`} height="h-72">
          <SavingsTrendChart series={series} />
        </ChartCard>
      </div>
    </div>
  );
}
