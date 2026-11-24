import { BUDGET_STATUS, MONTHS_SHORT, TX_TYPE } from './constants.js';

const pad2 = (n) => String(n).padStart(2, '0');

export const periodKey = (year, month) => `${year}-${pad2(month)}`;

/** Tanggal berformat 'yyyy-MM-dd' berada pada bulan/tahun tertentu? */
export const inPeriod = (dateStr, year, month) =>
  typeof dateStr === 'string' && dateStr.startsWith(`${periodKey(year, month)}-`);

export const previousPeriod = ({ year, month }) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

const sum = (list, pick) => list.reduce((s, x) => s + (Number(pick(x)) || 0), 0);

export const sumByType = (transactions, tipe) =>
  sum(transactions.filter((t) => t.tipe === tipe), (t) => t.nominal);

/**
 * Status budget. Ambang: <80% Aman, 80% s/d <100% Hampir Habis, =100% Habis, >100% Over Budget.
 * Memakai perkalian bilangan bulat agar tidak terkena kesalahan pembulatan desimal.
 */
export function getBudgetStatus(budget, actual) {
  if (budget <= 0) return actual > 0 ? BUDGET_STATUS.over : BUDGET_STATUS.aman;
  if (actual > budget) return BUDGET_STATUS.over;
  if (actual === budget) return BUDGET_STATUS.habis;
  if (actual * 100 >= budget * 80) return BUDGET_STATUS.hampir;
  return BUDGET_STATUS.aman;
}

export function percentUsed(budget, actual) {
  if (budget <= 0) return actual > 0 ? Infinity : 0;
  return (actual / budget) * 100;
}

export function expensesByCategory(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (t.tipe !== TX_TYPE.EXPENSE) continue;
    map.set(t.kategori, (map.get(t.kategori) || 0) + (Number(t.nominal) || 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Satu baris per budget pada periode terpilih, dengan aktual dihitung dari transaksi Pengeluaran. */
export function getBudgetRows(budgets, transactions, year, month) {
  const key = periodKey(year, month);
  const actualMap = new Map(expensesByCategory(transactions.filter((t) => inPeriod(t.tanggal, year, month))).map((x) => [x.name, x.value]));
  return budgets
    .filter((b) => b.bulan === key)
    .map((b) => {
      const actual = actualMap.get(b.kategori) || 0;
      return {
        kategori: b.kategori,
        budget: b.budget,
        actual,
        remaining: b.budget - actual,
        percent: percentUsed(b.budget, actual),
        status: getBudgetStatus(b.budget, actual),
      };
    });
}

/**
 * Ringkasan keuangan untuk satu bulan.
 * `budgets` harus sudah hanya berisi kategori bertipe Pengeluaran.
 * Sisa Budget = Total Budget - pengeluaran aktual pada kategori yang punya budget (sama dengan Excel);
 * pengeluaran pada kategori tanpa budget dilaporkan terpisah di `unbudgetedExpenses`.
 */
export function summarize(transactions, budgets, year, month) {
  const tx = transactions.filter((t) => inPeriod(t.tanggal, year, month));
  const income = sumByType(tx, TX_TYPE.INCOME);
  const expenses = sumByType(tx, TX_TYPE.EXPENSE);
  const savings = sumByType(tx, TX_TYPE.SAVINGS);
  const budgetRows = getBudgetRows(budgets, transactions, year, month);
  const totalBudget = sum(budgetRows, (r) => r.budget);
  const budgetedActual = sum(budgetRows, (r) => r.actual);
  return {
    count: tx.length,
    income,
    expenses,
    savings,
    balance: income - expenses - savings,
    savingRate: income > 0 ? (savings / income) * 100 : 0,
    totalBudget,
    budgetedActual,
    remainingBudget: totalBudget - budgetedActual,
    unbudgetedExpenses: expenses - budgetedActual,
    budgetRows,
    expensesByCategory: expensesByCategory(tx),
  };
}

/** Deret 12 bulan pada satu tahun: pemasukan, pengeluaran, tabungan. */
export function monthlySeries(transactions, year) {
  const series = MONTHS_SHORT.map((label, i) => ({ month: i + 1, label, income: 0, expenses: 0, savings: 0 }));
  const prefix = `${year}-`;
  for (const t of transactions) {
    if (typeof t.tanggal !== 'string' || !t.tanggal.startsWith(prefix)) continue;
    const m = Number(t.tanggal.slice(5, 7));
    if (!(m >= 1 && m <= 12)) continue;
    const row = series[m - 1];
    const n = Number(t.nominal) || 0;
    if (t.tipe === TX_TYPE.INCOME) row.income += n;
    else if (t.tipe === TX_TYPE.EXPENSE) row.expenses += n;
    else if (t.tipe === TX_TYPE.SAVINGS) row.savings += n;
  }
  return series;
}
