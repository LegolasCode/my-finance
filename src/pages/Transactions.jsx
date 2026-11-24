import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext.jsx';
import { useYears } from '../hooks/useYears.js';
import { sumByType } from '../lib/calculations.js';
import { TX_TYPE } from '../lib/constants.js';
import { formatIDR } from '../lib/format.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States.jsx';
import TransactionFilters from '../components/transactions/TransactionFilters.jsx';
import TransactionList from '../components/transactions/TransactionList.jsx';
import TransactionFormModal from '../components/transactions/TransactionFormModal.jsx';

const PAGE_SIZE = 50;
const pad2 = (n) => String(n).padStart(2, '0');

const defaultFilters = () => {
  const now = new Date();
  return { search: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), kategori: 'all', tipe: 'all' };
};

export default function Transactions() {
  const { transactions, categories, status, error, reload, removeTransaction } = useFinance();
  const years = useYears();
  const [filters, setFilters] = useState(defaultFilters);
  const [sortDir, setSortDir] = useState('desc');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [formState, setFormState] = useState(null); // null | { initial }
  const [lastTipe, setLastTipe] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setVisible(PAGE_SIZE); }, [filters, sortDir]);

  const categoryNames = useMemo(() => [...new Set(categories.map((c) => c.nama))].sort((a, b) => a.localeCompare(b, 'id')), [categories]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const dir = sortDir === 'desc' ? -1 : 1;
    return transactions
      .map((t, i) => ({ ...t, _i: i }))
      .filter((t) => {
        if (filters.year !== 'all' && t.tanggal.slice(0, 4) !== filters.year) return false;
        if (filters.month !== 'all' && t.tanggal.slice(5, 7) !== pad2(filters.month)) return false;
        if (filters.kategori !== 'all' && t.kategori !== filters.kategori) return false;
        if (filters.tipe !== 'all' && t.tipe !== filters.tipe) return false;
        if (q && !`${t.catatan} ${t.kategori}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (a.tanggal === b.tanggal ? (a._i - b._i) * dir : a.tanggal.localeCompare(b.tanggal) * dir));
  }, [transactions, filters, sortDir]);

  const totals = useMemo(() => ({
    income: sumByType(filtered, TX_TYPE.INCOME),
    expense: sumByType(filtered, TX_TYPE.EXPENSE),
    savings: sumByType(filtered, TX_TYPE.SAVINGS),
  }), [filtered]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await removeTransaction(toDelete.id);
      setToDelete(null);
    } catch {
      // toast galat sudah tampil; dialog dibiarkan terbuka untuk dicoba lagi
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="comic-title text-4xl sm:text-5xl">Transaksi</h1>
          <p className="mt-2 text-sm font-medium">Catat dan kelola pemasukan, pengeluaran, dan tabungan.</p>
        </div>
        <Button icon={Plus} onClick={() => setFormState({ initial: null })}>Tambah<span className="hidden sm:inline">&nbsp;Transaksi</span></Button>
      </div>

      <Card flat tone="surface">
        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          categoryNames={categoryNames}
          years={years}
          onReset={() => setFilters({ search: '', month: 'all', year: 'all', kategori: 'all', tipe: 'all' })}
        />
      </Card>

      {status === 'loading' && !transactions.length ? <Spinner label="Mengambil transaksi…" />
        : status === 'error' ? <ErrorState error={error} onRetry={reload} />
          : (
            <Card padded={false} flat tone="surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink px-4 py-3 text-xs font-bold uppercase tracking-wide">
                <span>{filtered.length} transaksi</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1.5 normal-case">
                  <span className="comic-badge tone-income comic-num">Masuk {formatIDR(totals.income)}</span>
                  <span className="comic-badge tone-expense comic-num">Keluar {formatIDR(totals.expense)}</span>
                  <span className="comic-badge tone-secondary comic-num">Tabungan {formatIDR(totals.savings)}</span>
                </span>
              </div>
              {filtered.length === 0 ? (
                <EmptyState
                  title={transactions.length === 0 ? 'Belum ada transaksi' : 'Tidak ada transaksi yang cocok'}
                  description={transactions.length === 0 ? 'Mulai dengan menambahkan transaksi pertama Anda.' : filtersActive ? 'Ubah atau atur ulang filter untuk melihat transaksi lain.' : undefined}
                  action={transactions.length === 0 ? <Button icon={Plus} onClick={() => setFormState({ initial: null })}>Tambah transaksi</Button> : undefined}
                />
              ) : (
                <>
                  <TransactionList
                    items={filtered.slice(0, visible)}
                    sortDir={sortDir}
                    onToggleSort={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                    onEdit={(tx) => setFormState({ initial: tx })}
                    onDelete={setToDelete}
                  />
                  {filtered.length > visible && (
                    <div className="border-t-[3px] border-ink p-3 text-center">
                      <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>Tampilkan lebih banyak ({filtered.length - visible} lagi)</Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

      {formState && (
        <TransactionFormModal
          key={formState.initial?.id || 'new'}
          initial={formState.initial}
          lastTipe={lastTipe}
          onSaved={(tx) => setLastTipe(tx.tipe)}
          onClose={() => setFormState(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus transaksi?"
          message={`Transaksi ${toDelete.kategori} sebesar ${formatIDR(toDelete.nominal)} akan dihapus permanen dari Google Sheets. Tindakan ini tidak dapat dibatalkan.`}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
