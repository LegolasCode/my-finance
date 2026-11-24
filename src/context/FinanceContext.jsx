import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { newId } from '../lib/format.js';
import { TX_TYPE } from '../lib/constants.js';

const FinanceContext = createContext(null);
export const useFinance = () => useContext(FinanceContext);

const replaceBy = (list, item, same) => {
  const i = list.findIndex((x) => same(x, item));
  return i < 0 ? [...list, item] : list.map((x, idx) => (idx === i ? item : x));
};
const budgetKey = (b) => `${b.bulan}|${b.kategori}`;

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const now = new Date();

  const [data, setData] = useState({ transactions: [], budgets: [], categories: [] });
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const d = await api.bootstrap();
      setData({ transactions: d.transactions, budgets: d.budgets, categories: d.categories });
      setLastSync(new Date());
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => { if (user) reload(); }, [user, reload]);

  /** Menjalankan mutasi: toast sukses/gagal, lalu melempar ulang galat agar form tetap terbuka. */
  const run = useCallback(async (fn, successMessage) => {
    try {
      const result = await fn();
      if (successMessage) toast.success(successMessage);
      setLastSync(new Date());
      return result;
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan.');
      throw err;
    }
  }, [toast]);

  // `input.id` dibuat sekali per form; mengirim ulang dengan ID sama tidak membuat duplikat.
  const addTransaction = useCallback(async (input) => {
    const saved = await run(() => api.createTransaction({ ...input, id: input.id || newId() }), 'Transaksi disimpan ke Google Sheets Anda.');
    setData((d) => ({ ...d, transactions: replaceBy(d.transactions, saved, (a, b) => a.id === b.id) }));
    return saved;
  }, [run]);

  const editTransaction = useCallback(async (input) => {
    const saved = await run(() => api.updateTransaction(input), 'Transaksi diperbarui.');
    setData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === saved.id ? saved : t)) }));
    return saved;
  }, [run]);

  const removeTransaction = useCallback(async (id) => {
    await run(() => api.deleteTransaction(id), 'Transaksi dihapus.');
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
  }, [run]);

  const saveBudgets = useCallback(async (items, message = 'Budget disimpan.') => {
    const saved = await run(() => api.upsertBudgets(items), message);
    setData((d) => ({ ...d, budgets: saved.reduce((list, b) => replaceBy(list, b, (a, c) => budgetKey(a) === budgetKey(c)), d.budgets) }));
    return saved;
  }, [run]);

  const removeBudget = useCallback(async (bulan, kategori) => {
    await run(() => api.deleteBudget(bulan, kategori), 'Budget dihapus.');
    setData((d) => ({ ...d, budgets: d.budgets.filter((b) => !(b.bulan === bulan && b.kategori === kategori)) }));
  }, [run]);

  const addCategory = useCallback(async (nama, tipe) => {
    const categories = await run(() => api.createCategory(nama, tipe), 'Kategori ditambahkan.');
    setData((d) => ({ ...d, categories }));
  }, [run]);

  const toggleCategory = useCallback(async (nama, aktif) => {
    const categories = await run(() => api.setCategoryActive(nama, aktif), aktif ? 'Kategori diaktifkan.' : 'Kategori dinonaktifkan.');
    setData((d) => ({ ...d, categories }));
  }, [run]);

  // Budget hanya untuk kategori bertipe Pengeluaran.
  const expenseNames = useMemo(
    () => new Set(data.categories.filter((c) => c.tipe === TX_TYPE.EXPENSE).map((c) => c.nama)),
    [data.categories],
  );
  const expenseBudgets = useMemo(
    () => data.budgets.filter((b) => expenseNames.has(b.kategori)),
    [data.budgets, expenseNames],
  );

  const value = useMemo(() => ({
    ...data,
    expenseBudgets,
    status,
    error,
    lastSync,
    period,
    setPeriod,
    reload,
    addTransaction,
    editTransaction,
    removeTransaction,
    saveBudgets,
    removeBudget,
    addCategory,
    toggleCategory,
  }), [data, expenseBudgets, status, error, lastSync, period, reload, addTransaction, editTransaction, removeTransaction, saveBudgets, removeBudget, addCategory, toggleCategory]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
