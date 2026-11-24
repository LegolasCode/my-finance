import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGoogle } from './fake-google.mjs';
import { setRetryDelay, setTokenProvider } from '../src/api/google.js';
import { ensureWorkspace } from '../src/api/workspace.js';
import * as sheets from '../src/api/sheets.js';
import { isoToSerial, serialToIso } from '../src/lib/dates.js';
import { summarize } from '../src/lib/calculations.js';

let g;
const as = (token) => setTokenProvider(async () => token);
const open = async (account = 'A', token = `tok-${account}`) => {
  as(token);
  const ws = await ensureWorkspace();
  sheets.bindSpreadsheet(ws.spreadsheetId, `${account.toLowerCase()}@example.com`);
  return ws;
};
let n = 0;
const tx = (over = {}) => ({ id: `txn_test-${++n}-aaaaaaaa`, tanggal: '2026-11-21', kategori: 'Makan & Minum', tipe: 'Pengeluaran', nominal: 25000, catatan: 'Siang', ...over });

beforeEach(() => {
  g = createFakeGoogle();
  globalThis.fetch = g.fetch;
  setRetryDelay(1);
  as('tok-A');
});

test('tanggal: nomor seri Sheets dua arah', () => {
  assert.equal(isoToSerial('1970-01-01'), 25569);
  assert.equal(isoToSerial('2000-01-01'), 36526);
  for (const d of ['2026-11-21', '2024-02-29', '2100-12-31']) assert.equal(serialToIso(isoToSerial(d)), d);
  assert.equal(serialToIso('2026-11-21'), '2026-11-21');
  assert.equal(serialToIso(undefined), '');
});

test('login pertama: spreadsheet dibuat di Drive pengguna dan strukturnya disiapkan', async () => {
  const steps = [];
  as('tok-A');
  const ws = await ensureWorkspace({ onStep: (s) => steps.push(s) });
  assert.equal(ws.created, true);
  assert.deepEqual(steps, ['find', 'create', 'setup']);
  const f = g.file('A', ws.spreadsheetId);
  assert.equal(f.appProperties.pft_app, 'finance-tracker');
  assert.equal(f.locale, 'en_US');
  assert.deepEqual(f.sheets.map((s) => s.title).sort(), ['Budget', 'Dashboard', 'Kategori', 'Transaksi']);
  assert.equal(f.sheets.find((s) => s.title === 'Transaksi').sheetId, 0, 'Sheet1 bawaan diganti nama, bukan dibuat ulang');
  const tab = (t) => f.sheets.find((s) => s.title === t).rows;
  assert.deepEqual(tab('Transaksi')[0], ['ID', 'Tanggal', 'Kategori', 'Tipe', 'Nominal', 'Catatan']);
  assert.deepEqual(tab('Budget')[0], ['Bulan', 'Kategori', 'Budget', 'Pengeluaran Aktual', 'Sisa Budget', 'Status']);
  assert.equal(tab('Kategori').length, 9);
  assert.deepEqual(tab('Kategori')[1], ['Gaji', 'Pemasukan', true]);
  assert.match(tab('Dashboard')[4][0], /^=SUMIFS\(/);
  assert.ok(f.formatting.length > 10, 'format dikirim');
  assert.equal(g.files('B').length, 0, 'akun lain tidak tersentuh');
});

test('login berikutnya: memakai spreadsheet yang sama, tidak menimpa data', async () => {
  const first = await open('A');
  await sheets.createTransaction(tx());
  const again = await ensureWorkspace();
  assert.equal(again.created, false);
  assert.equal(again.spreadsheetId, first.spreadsheetId);
  assert.equal(g.files('A').length, 1);
  assert.equal(g.file('A', first.spreadsheetId).sheets.find((s) => s.title === 'Kategori').rows.length, 9);
  assert.equal((await sheets.bootstrap()).transactions.length, 1);
});

test('PRIVASI: dua pengguna punya spreadsheet terpisah dan tidak bisa saling membaca', async () => {
  const a = await open('A');
  await sheets.createTransaction(tx({ catatan: 'rahasia A' }));
  const b = await open('B');
  assert.notEqual(a.spreadsheetId, b.spreadsheetId);
  assert.deepEqual((await sheets.bootstrap()).transactions, [], 'B tidak melihat data A');
  // B mencoba membuka spreadsheet milik A dengan token B -> ditolak oleh Google (tiruan: 404)
  sheets.bindSpreadsheet(a.spreadsheetId, 'b@example.com');
  await assert.rejects(() => sheets.bootstrap(), (e) => e.code === 'NOT_FOUND');
  // A tetap utuh
  as('tok-A');
  sheets.bindSpreadsheet(a.spreadsheetId, 'a@example.com');
  assert.equal((await sheets.bootstrap()).transactions[0].catatan, 'rahasia A');
});

test('tidak ada permintaan ke domain selain Google (tanpa server perantara)', async () => {
  await open('A');
  await sheets.createTransaction(tx());
  await sheets.bootstrap();
  assert.ok(g.state.log.length > 5);
  for (const l of g.state.log) assert.ok(l.path.startsWith('/v4/spreadsheets') || l.path.startsWith('/drive/v3/files'), l.path);
});

test('spreadsheet yang dibuang ke sampah diabaikan dan dibuat ulang; ganda -> pilih yang tertua', async () => {
  const first = await open('A');
  g.file('A', first.spreadsheetId).trashed = true;
  const second = await ensureWorkspace({ cachedId: first.spreadsheetId });
  assert.equal(second.created, true);
  assert.notEqual(second.spreadsheetId, first.spreadsheetId);
  const third = await ensureWorkspace();
  assert.equal(third.spreadsheetId, second.spreadsheetId);
});

test('CRUD transaksi: RAW, tanggal serial, idempoten', async () => {
  const ws = await open('A');
  const t = tx({ catatan: '=HYPERLINK("http://x")' });
  assert.equal((await sheets.createTransaction(t)).duplicate, false);
  assert.equal((await sheets.createTransaction(t)).duplicate, true, 'ID sama tidak menggandakan');
  const rows = g.file('A', ws.spreadsheetId).sheets.find((s) => s.title === 'Transaksi').rows;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], [t.id, isoToSerial('2026-11-21'), 'Makan & Minum', 'Pengeluaran', 25000, '=HYPERLINK("http://x")']);
  const append = g.state.log.find((l) => l.path.includes(':append'));
  assert.match(append.path, /values\/Transaksi!A%3AF:append\?/);
  assert.match(append.path, /valueInputOption=RAW/);
  assert.deepEqual((await sheets.bootstrap()).transactions[0], t);

  await sheets.updateTransaction({ ...t, nominal: 99000, catatan: 'Revisi' });
  const after = (await sheets.bootstrap()).transactions;
  assert.equal(after.length, 1);
  assert.equal(after[0].nominal, 99000);
  await assert.rejects(() => sheets.updateTransaction(tx()), (e) => e.code === 'NOT_FOUND');

  assert.equal((await sheets.deleteTransaction(t.id)).deleted, true);
  assert.equal((await sheets.deleteTransaction(t.id)).deleted, false);
  assert.equal((await sheets.bootstrap()).transactions.length, 0);
});

test('hapus menghapus baris yang benar di antara beberapa baris', async () => {
  await open('A');
  const [a, b, c] = [tx({ nominal: 1000 }), tx({ nominal: 2000 }), tx({ nominal: 3000 })];
  for (const t of [a, b, c]) await sheets.createTransaction(t);
  await sheets.deleteTransaction(b.id);
  assert.deepEqual((await sheets.bootstrap()).transactions.map((t) => t.nominal), [1000, 3000]);
  await sheets.updateTransaction({ ...c, nominal: 3500 });
  assert.deepEqual((await sheets.bootstrap()).transactions.map((t) => t.nominal), [1000, 3500]);
});

test('validasi data layer', async () => {
  await open('A');
  const bad = async (over) => assert.rejects(() => sheets.createTransaction(tx(over)), (e) => e.code === 'VALIDATION');
  await bad({ nominal: -5 }); await bad({ nominal: 0 }); await bad({ nominal: '100' }); await bad({ nominal: 10.5 });
  await bad({ tanggal: '2026-02-30' }); await bad({ tipe: 'Lainnya' }); await bad({ id: 'abc' }); await bad({ kategori: '' });
  assert.equal((await sheets.bootstrap()).transactions.length, 0);
});

test('tulis bersamaan tidak ada yang hilang (antrean serial)', async () => {
  await open('A');
  const list = Array.from({ length: 8 }, (_, i) => tx({ nominal: 1000 + i }));
  await Promise.all(list.map((t) => sheets.createTransaction(t)));
  const got = (await sheets.bootstrap()).transactions;
  assert.equal(got.length, 8);
  assert.equal(new Set(got.map((t) => t.id)).size, 8);
});

test('budget: upsert, rumus ditulis di baris yang benar, tanpa duplikat', async () => {
  const ws = await open('A');
  await sheets.upsertBudgets([
    { bulan: '2026-11', kategori: 'Makan & Minum', budget: 130000 },
    { bulan: '2026-11', kategori: 'Transportasi', budget: 740000 },
  ]);
  const rows = g.file('A', ws.spreadsheetId).sheets.find((s) => s.title === 'Budget').rows;
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1].slice(0, 3), [isoToSerial('2026-11-01'), 'Makan & Minum', 130000]);
  assert.ok(rows[1][3].startsWith('=SUMIFS(') && rows[1][3].includes(',B2,') && rows[1][3].includes('$A2'));
  assert.ok(rows[2][3].includes(',B3,') && rows[2][3].includes('$A3'), 'baris 3 merujuk B3/A3');
  assert.equal(rows[2][4], '=C3-D3', 'baris kedua memakai nomor baris 3');
  const formulaPut = g.state.log.find((l) => l.method === 'PUT' && l.path.includes('Budget!D2%3AF3'));
  assert.ok(formulaPut && /USER_ENTERED/.test(formulaPut.path));

  await sheets.upsertBudgets([{ bulan: '2026-11', kategori: 'Makan & Minum', budget: 150000 }]);
  const b = (await sheets.bootstrap()).budgets;
  assert.equal(b.length, 2);
  assert.equal(b.find((x) => x.kategori === 'Makan & Minum').budget, 150000);
  assert.equal(g.file('A', ws.spreadsheetId).sheets.find((s) => s.title === 'Budget').rows.length, 3);
});

test('budget: hanya kategori Pengeluaran, semua-atau-tidak-sama-sekali, hapus idempoten', async () => {
  await open('A');
  const ok = { bulan: '2026-11', kategori: 'Transportasi', budget: 1000 };
  for (const bad of [{ ...ok, kategori: 'Tabungan' }, { ...ok, kategori: 'Gaji' }, { ...ok, budget: 0 }, { ...ok, bulan: '2026-13' }, { ...ok, budget: 10.5 }]) {
    await assert.rejects(() => sheets.upsertBudgets([bad]), (e) => e.code === 'VALIDATION');
  }
  await assert.rejects(() => sheets.upsertBudgets([ok, { ...ok, kategori: 'Pulsa & Internet', budget: -1 }]), (e) => e.code === 'VALIDATION');
  assert.equal((await sheets.bootstrap()).budgets.length, 0);
  await assert.rejects(() => sheets.upsertBudgets([]), (e) => e.code === 'VALIDATION');
  await sheets.upsertBudgets([ok]);
  assert.equal((await sheets.deleteBudget('2026-11', 'Transportasi')).deleted, true);
  assert.equal((await sheets.deleteBudget('2026-11', 'Transportasi')).deleted, false);
});

test('kategori: tambah, tolak duplikat/berbahaya, nonaktifkan', async () => {
  await open('A');
  const added = await sheets.createCategory('Kesehatan', 'Pengeluaran');
  assert.equal(added.categories.length, 9);
  await assert.rejects(() => sheets.createCategory('kesehatan', 'Pengeluaran'), (e) => e.code === 'VALIDATION');
  await assert.rejects(() => sheets.createCategory('=1+1', 'Pengeluaran'), (e) => e.code === 'VALIDATION');
  await assert.rejects(() => sheets.createCategory('X', 'Lain'), (e) => e.code === 'VALIDATION');
  const off = await sheets.setCategoryActive('Kesehatan', false);
  assert.equal(off.categories.find((c) => c.nama === 'Kesehatan').aktif, false);
  assert.equal((await sheets.bootstrap()).categories.find((c) => c.nama === 'Kesehatan').aktif, false);
  await assert.rejects(() => sheets.setCategoryActive('Tidak Ada', true), (e) => e.code === 'NOT_FOUND');
});

test('token kedaluwarsa: 401 memicu refresh token lalu berhasil', async () => {
  await open('A');
  const calls = [];
  setTokenProvider(async ({ forceRefresh }) => { calls.push(forceRefresh); return forceRefresh ? 'tok-A' : 'tok-expired'; });
  assert.deepEqual((await sheets.bootstrap()).transactions, []);
  assert.deepEqual(calls, [false, true]);
});

test('refresh gagal -> UNAUTHENTICATED', async () => {
  await open('A');
  setTokenProvider(async () => { const e = new Error('x'); e.code = 'UNAUTHENTICATED'; throw e; });
  await assert.rejects(() => sheets.bootstrap(), (e) => e.code === 'UNAUTHENTICATED');
  setTokenProvider(async () => 'tok-expired');
  await assert.rejects(() => sheets.bootstrap(), (e) => e.code === 'UNAUTHENTICATED');
});

test('galat 5xx pada baca diulang; append TIDAK diulang otomatis', async () => {
  await open('A');
  g.state.failNext.push({ match: /values:batchGet/, status: 503 });
  assert.deepEqual((await sheets.bootstrap()).transactions, []);

  g.state.failNext.push({ match: /:append/, status: 500 });
  const t = tx();
  await assert.rejects(() => sheets.createTransaction(t), (e) => e.code === 'API');
  assert.equal((await sheets.bootstrap()).transactions.length, 0);
  assert.equal((await sheets.createTransaction(t)).duplicate, false, 'coba lagi dengan ID sama berhasil');
  assert.equal((await sheets.bootstrap()).transactions.length, 1);
});

test('jaringan putus SETELAH Google menulis: tidak ada duplikat dan dilaporkan sukses', async () => {
  await open('A');
  const t = tx();
  g.state.dropResponseAfter = /:append/;
  const r = await sheets.createTransaction(t);
  assert.equal(r.duplicate, true);
  assert.equal((await sheets.bootstrap()).transactions.length, 1);
});

test('API belum diaktifkan -> pesan jelas', async () => {
  await open('A');
  g.fetch = async () => new Response(JSON.stringify({ error: { message: 'Google Sheets API has not been used in project 123 before or it is disabled.' } }), { status: 403 });
  globalThis.fetch = g.fetch;
  await assert.rejects(() => sheets.bootstrap(), (e) => e.code === 'API_DISABLED' && /diaktifkan/.test(e.message));
});

test('selfTest lulus dan tidak meninggalkan baris', async () => {
  await open('A');
  const r = await sheets.selfTest();
  assert.equal(r.passed, true, JSON.stringify(r.steps));
  assert.equal(r.user, 'a@example.com');
  assert.equal((await sheets.bootstrap()).transactions.length, 0);
  assert.equal((await sheets.checkConnection()).tabs.length, 4);
});

test('end-to-end: data Excel -> Sheets -> angka acuan dashboard', async () => {
  await open('A');
  const rows = [
    ['2026-11-21', 'Transportasi', 'Pengeluaran', 61100], ['2026-11-21', 'Makan & Minum', 'Pengeluaran', 153000],
    ['2026-11-21', 'Belanja Kebutuhan', 'Pengeluaran', 550000], ['2026-11-21', 'Hiburan & Nongkrong', 'Pengeluaran', 40000],
    ['2026-11-21', 'Belanja Kebutuhan', 'Pengeluaran', 8000], ['2026-11-21', 'Bonus', 'Pemasukan', 29000],
    ['2026-11-21', 'Gaji', 'Pemasukan', 1670000], ['2026-11-22', 'Makan & Minum', 'Pengeluaran', 26500],
    ['2026-11-23', 'Tabungan', 'Tabungan', 300000], ['2026-11-23', 'Makan & Minum', 'Pengeluaran', 12000],
    ['2026-11-23', 'Belanja Kebutuhan', 'Pengeluaran', 41000],
  ];
  for (const [tanggal, kategori, tipe, nominal] of rows) await sheets.createTransaction(tx({ tanggal, kategori, tipe, nominal, catatan: '' }));
  await sheets.upsertBudgets([['Makan & Minum', 130000], ['Transportasi', 740000], ['Pulsa & Internet', 100000], ['Hiburan & Nongkrong', 300000], ['Belanja Kebutuhan', 100000]]
    .map(([kategori, budget]) => ({ bulan: '2026-11', kategori, budget })));
  const d = await sheets.bootstrap();
  const s = summarize(d.transactions, d.budgets, 2026, 11);
  assert.deepEqual([s.income, s.expenses, s.savings, s.balance, s.remainingBudget], [1699000, 891600, 300000, 507400, 478400]);
});
