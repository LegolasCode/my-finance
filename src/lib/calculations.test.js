import test from 'node:test';
import assert from 'node:assert/strict';
import { getBudgetRows, getBudgetStatus, inPeriod, monthlySeries, previousPeriod, summarize } from './calculations.js';
import { isValidISODate, parseAmountText, validateBudget, validateCategoryName, validateTransaction } from './validators.js';
import { formatDate, formatIDR, formatPercent } from './format.js';

// Data nyata dari Pengatur_Keuangan.xlsx (baris 10 tanpa nominal tidak diimpor).
const t = (tanggal, kategori, tipe, nominal) => ({ id: `x${Math.random()}`, tanggal, kategori, tipe, nominal, catatan: '' });
const TX = [
  t('2026-11-21', 'Transportasi', 'Pengeluaran', 61100),
  t('2026-11-21', 'Makan & Minum', 'Pengeluaran', 153000),
  t('2026-11-21', 'Belanja Kebutuhan', 'Pengeluaran', 550000),
  t('2026-11-21', 'Hiburan & Nongkrong', 'Pengeluaran', 40000),
  t('2026-11-21', 'Belanja Kebutuhan', 'Pengeluaran', 8000),
  t('2026-11-21', 'Bonus', 'Pemasukan', 29000),
  t('2026-11-21', 'Gaji', 'Pemasukan', 1670000),
  t('2026-11-22', 'Makan & Minum', 'Pengeluaran', 26500),
  t('2026-11-23', 'Tabungan', 'Tabungan', 300000),
  t('2026-11-23', 'Makan & Minum', 'Pengeluaran', 12000),
  t('2026-11-23', 'Belanja Kebutuhan', 'Pengeluaran', 41000),
];
const BUDGETS = [
  { bulan: '2026-11', kategori: 'Makan & Minum', budget: 130000 },
  { bulan: '2026-11', kategori: 'Transportasi', budget: 740000 },
  { bulan: '2026-11', kategori: 'Pulsa & Internet', budget: 100000 },
  { bulan: '2026-11', kategori: 'Hiburan & Nongkrong', budget: 300000 },
  { bulan: '2026-11', kategori: 'Belanja Kebutuhan', budget: 100000 },
];

test('angka acuan November 2026 sesuai Excel (setelah koreksi)', () => {
  const s = summarize(TX, BUDGETS, 2026, 11);
  assert.equal(s.income, 1699000);
  assert.equal(s.expenses, 891600);
  assert.equal(s.savings, 300000);
  assert.equal(s.balance, 507400);
  assert.ok(Math.abs(s.savingRate - 17.65744556) < 1e-6);
  assert.equal(s.totalBudget, 1370000);
  assert.equal(s.remainingBudget, 478400);
  assert.equal(s.unbudgetedExpenses, 0);
});

test('tabungan tidak dihitung sebagai pengeluaran (tanpa double counting)', () => {
  const s = summarize(TX, BUDGETS, 2026, 11);
  assert.equal(s.expenses, 891600);
  assert.equal(s.expensesByCategory.find((x) => x.name === 'Tabungan'), undefined);
});

test('realisasi dan status per kategori', () => {
  const rows = Object.fromEntries(getBudgetRows(BUDGETS, TX, 2026, 11).map((r) => [r.kategori, r]));
  assert.equal(rows['Makan & Minum'].actual, 191500);
  assert.equal(rows['Makan & Minum'].status.label, 'Over Budget');
  assert.equal(rows['Belanja Kebutuhan'].actual, 599000);
  assert.equal(rows['Belanja Kebutuhan'].status.label, 'Over Budget');
  assert.equal(rows['Transportasi'].status.label, 'Aman');
  assert.equal(rows['Pulsa & Internet'].actual, 0);
  assert.equal(rows['Hiburan & Nongkrong'].remaining, 260000);
});

test('ambang status budget', () => {
  const s = (a) => getBudgetStatus(100000, a).label;
  assert.equal(s(0), 'Aman');
  assert.equal(s(79999), 'Aman');
  assert.equal(s(80000), 'Hampir Habis');
  assert.equal(s(99999), 'Hampir Habis');
  assert.equal(s(100000), 'Habis');
  assert.equal(s(100001), 'Over Budget');
  assert.equal(getBudgetStatus(0, 0).label, 'Aman');
  assert.equal(getBudgetStatus(0, 5).label, 'Over Budget');
});

test('tanpa pemasukan, saving rate = 0%', () => {
  const s = summarize([t('2026-11-01', 'Tabungan', 'Tabungan', 100000)], [], 2026, 11);
  assert.equal(s.savingRate, 0);
  assert.equal(s.balance, -100000);
});

test('periode kosong tidak error', () => {
  const s = summarize(TX, BUDGETS, 2026, 12);
  assert.equal(s.income, 0);
  assert.equal(s.count, 0);
  assert.equal(s.remainingBudget, 0);
  assert.deepEqual(s.expensesByCategory, []);
});

test('pengeluaran pada kategori tanpa budget dilaporkan terpisah', () => {
  const extra = [...TX, t('2026-11-10', 'Pulsa & Internet', 'Pengeluaran', 50000)];
  const onlyTwo = BUDGETS.filter((b) => b.kategori !== 'Pulsa & Internet');
  const s = summarize(extra, onlyTwo, 2026, 11);
  assert.equal(s.unbudgetedExpenses, 50000);
  assert.equal(s.remainingBudget, 1270000 - 891600);
});

test('periode: batas bulan dan tahun', () => {
  assert.equal(inPeriod('2026-11-30', 2026, 11), true);
  assert.equal(inPeriod('2026-12-01', 2026, 11), false);
  assert.equal(inPeriod('2025-11-15', 2026, 11), false);
  assert.deepEqual(previousPeriod({ year: 2026, month: 1 }), { year: 2025, month: 12 });
});

test('deret bulanan 12 bulan', () => {
  const s = monthlySeries(TX, 2026);
  assert.equal(s.length, 12);
  assert.equal(s[10].income, 1699000);
  assert.equal(s[10].expenses, 891600);
  assert.equal(s[10].savings, 300000);
  assert.equal(s[0].income, 0);
});

test('parse nominal', () => {
  assert.equal(parseAmountText('1.500.000'), 1500000);
  assert.equal(parseAmountText(' 25000 '), 25000);
  assert.ok(Number.isNaN(parseAmountText('')));
  assert.ok(Number.isNaN(parseAmountText('abc')));
  assert.ok(Number.isNaN(parseAmountText('12,5')));
  assert.equal(parseAmountText('-5000'), -1);
});

test('validasi tanggal', () => {
  assert.equal(isValidISODate('2026-11-21'), true);
  assert.equal(isValidISODate('2026-02-30'), false);
  assert.equal(isValidISODate('2024-02-29'), true);
  assert.equal(isValidISODate('21/11/2026'), false);
  assert.equal(isValidISODate(''), false);
  assert.equal(isValidISODate('1999-01-01'), false);
});

test('validasi transaksi', () => {
  const ok = { tanggal: '2026-11-21', kategori: 'Gaji', tipe: 'Pemasukan', nominal: 1000, catatan: '' };
  assert.deepEqual(validateTransaction(ok, ['Gaji', 'Bonus']), {});
  assert.ok(validateTransaction({ ...ok, nominal: parseAmountText('-5') }, ['Gaji']).nominal.includes('negatif'));
  assert.ok(validateTransaction({ ...ok, nominal: NaN }, ['Gaji']).nominal);
  assert.ok(validateTransaction({ ...ok, nominal: 0 }, ['Gaji']).nominal);
  assert.ok(validateTransaction({ ...ok, tanggal: '2026-13-01' }, ['Gaji']).tanggal);
  assert.ok(validateTransaction({ ...ok, kategori: 'Transportasi' }, ['Gaji']).kategori);
  assert.ok(validateTransaction({ ...ok, tipe: 'Lainnya' }, ['Gaji']).tipe);
});

test('validasi budget dan kategori', () => {
  assert.deepEqual(validateBudget({ budget: 100000 }), {});
  assert.ok(validateBudget({ budget: 0 }).budget);
  assert.ok(validateBudget({ budget: NaN }).budget);
  assert.ok(validateCategoryName('', []));
  assert.ok(validateCategoryName('gaji', ['Gaji']));
  assert.ok(validateCategoryName('=CMD()', []));
  assert.equal(validateCategoryName('Kesehatan', ['Gaji']), '');
});

test('format Indonesia', () => {
  assert.match(formatIDR(1699000).replace(/\s/g, ' '), /^Rp 1\.699\.000$/);
  assert.equal(formatDate('2026-11-21'), '21 Nov 2026');
  assert.equal(formatDate('bukan-tanggal'), '-');
  assert.equal(formatPercent(Infinity), '>100%');
});
