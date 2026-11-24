/**
 * Lapisan data: membaca/menulis ke spreadsheet milik pengguna lewat Google Sheets API.
 * Antarmuka sama dengan versi Apps Script sebelumnya sehingga UI tidak perlu berubah.
 *
 * Catatan desain:
 *  - Semua penulisan memakai valueInputOption=RAW: teks seperti "=1+1" tersimpan sebagai teks (anti formula-injection).
 *  - Tanggal disimpan sebagai nomor seri + format kolom (lihat lib/dates.js).
 *  - Penulisan diserialkan (satu per satu) agar "baca baris -> tulis" tidak saling menimpa di satu tab.
 *  - create bersifat idempoten (ID dibuat di browser): kirim ulang tidak menggandakan baris.
 */
import { ApiError, request, qs } from './google.js';
import { SHEETS_URL, TAB, budgetFormulas } from './workspace.js';
import { isoToSerial, monthToSerial, serialToIso } from '../lib/dates.js';
import { isValidISODate } from '../lib/validators.js';
import { LIMITS, TX_TYPE, TX_TYPES } from '../lib/constants.js';

const ctx = { spreadsheetId: null, email: '', sheetIds: null };

export function bindSpreadsheet(id, email = '') {
  ctx.spreadsheetId = id;
  ctx.email = email;
  ctx.sheetIds = null;
}

const sid = () => {
  if (!ctx.spreadsheetId) throw new ApiError('NOT_READY', 'Spreadsheet belum siap.');
  return ctx.spreadsheetId;
};
const enc = encodeURIComponent;
const valuesUrl = (range, extra = '') => `${SHEETS_URL}/${sid()}/values/${enc(range)}${extra}`;
const READ = { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' };

let chain = Promise.resolve();
const serialize = (fn) => {
  const run = chain.then(fn);
  chain = run.catch(() => {});
  return run;
};

const fail = (code, message) => new ApiError(code, message);
const ID_PATTERN = /^txn_[A-Za-z0-9-]{8,64}$/;

// ---------- parsing ----------
const rowToTx = (r) => ({
  id: String(r[0]),
  tanggal: serialToIso(r[1]),
  kategori: String(r[2] ?? ''),
  tipe: String(r[3] ?? ''),
  nominal: Number(r[4]) || 0,
  catatan: String(r[5] ?? ''),
});
const parseBudgets = (rows) => rows
  .map((r, i) => ({ bulan: serialToIso(r[0]).slice(0, 7), kategori: String(r[1] ?? ''), budget: Number(r[2]) || 0, _row: i + 2 }))
  .filter((b) => b.bulan && b.kategori);
const parseCategories = (rows) => rows
  .map((r, i) => ({ nama: String(r[0] ?? '').trim(), tipe: String(r[1] ?? '').trim(), aktif: r[2] === true || String(r[2]).toUpperCase() === 'TRUE', _row: i + 2 }))
  .filter((c) => c.nama);
const strip = ({ _row, ...rest }) => rest; // eslint-disable-line no-unused-vars

async function readRanges(ranges) {
  const data = await request(`${SHEETS_URL}/${sid()}/values:batchGet?${qs({ ranges, majorDimension: 'ROWS', ...READ })}`);
  return data.valueRanges.map((v) => v.values || []);
}

async function readIds() {
  const data = await request(valuesUrl(`${TAB.TX}!A2:A`, `?${qs(READ)}`));
  return (data.values || []).map((r) => (r[0] === undefined ? '' : String(r[0])));
}
const rowOf = (ids, id) => { const i = ids.indexOf(id); return i < 0 ? -1 : i + 2; };

async function sheetIdOf(tab) {
  if (!ctx.sheetIds) {
    const meta = await request(`${SHEETS_URL}/${sid()}?${qs({ fields: 'sheets.properties(sheetId,title)' })}`);
    ctx.sheetIds = Object.fromEntries((meta.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]));
  }
  if (ctx.sheetIds[tab] === undefined) throw fail('SHEET_MISSING', `Tab "${tab}" tidak ditemukan di spreadsheet Anda.`);
  return ctx.sheetIds[tab];
}

async function deleteRow(tab, row) {
  const sheetId = await sheetIdOf(tab);
  await request(`${SHEETS_URL}/${sid()}:batchUpdate`, {
    method: 'POST',
    body: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }] },
  });
}

const updatedRows = (resp) => {
  const m = /(\d+):[A-Z]+(\d+)$/.exec(resp?.updates?.updatedRange || '') || /(\d+)$/.exec(resp?.updates?.updatedRange || '');
  if (!m) throw fail('API', 'Respons Google tidak memuat posisi baris yang ditulis.');
  return [Number(m[1]), Number(m[2] || m[1])];
};

// ---------- baca ----------
export async function bootstrap() {
  const [tx, bud, cat] = await readRanges([`${TAB.TX}!A2:F`, `${TAB.BUDGET}!A2:C`, `${TAB.CAT}!A2:C`]);
  return {
    user: { email: ctx.email },
    transactions: tx.filter((r) => r[0] !== undefined && r[0] !== '').map(rowToTx),
    budgets: parseBudgets(bud).map(strip),
    categories: parseCategories(cat).map(strip),
  };
}

// ---------- transaksi ----------
function cleanTx(p) {
  const errors = [];
  const id = String(p.id || '').trim();
  if (!ID_PATTERN.test(id)) errors.push('ID transaksi tidak valid.');
  const tanggal = String(p.tanggal || '').trim();
  if (!isValidISODate(tanggal)) errors.push('Tanggal tidak valid.');
  const tipe = String(p.tipe || '').trim();
  if (!TX_TYPES.includes(tipe)) errors.push('Tipe tidak valid.');
  const nominal = typeof p.nominal === 'number' ? p.nominal : Number.NaN;
  if (!Number.isInteger(nominal) || nominal <= 0 || nominal > LIMITS.maxAmount) errors.push('Nominal harus bilangan bulat lebih besar dari 0.');
  const kategori = String(p.kategori || '').trim();
  if (!kategori) errors.push('Kategori wajib diisi.');
  const catatan = String(p.catatan ?? '').trim();
  if (catatan.length > LIMITS.maxNoteLength) errors.push('Catatan terlalu panjang.');
  if (errors.length) throw fail('VALIDATION', errors.join(' '));
  return { id, tanggal, kategori, tipe, nominal, catatan };
}
const txRow = (t) => [t.id, isoToSerial(t.tanggal), t.kategori, t.tipe, t.nominal, t.catatan];

const createTransactionRaw = async (p) => {
  const tx = cleanTx(p);
  const exists = async () => rowOf(await readIds(), tx.id) > 0;
  if (await exists()) return { transaction: tx, duplicate: true };
  try {
    await request(valuesUrl(`${TAB.TX}!A:F`, `:append?${qs({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })}`), {
      method: 'POST', retry: false, body: { values: [txRow(tx)] },
    });
  } catch (err) {
    // Jaringan putus setelah Google menulis? Cek dulu sebelum melaporkan gagal.
    if (err.code === 'NETWORK' && (await exists().catch(() => false))) return { transaction: tx, duplicate: true };
    throw err;
  }
  return { transaction: tx, duplicate: false };
};
export const createTransaction = (p) => serialize(() => createTransactionRaw(p));

const updateTransactionRaw = async (p) => {
  const tx = cleanTx(p);
  const row = rowOf(await readIds(), tx.id);
  if (row < 0) throw fail('NOT_FOUND', 'Transaksi tidak ditemukan. Mungkin sudah dihapus.');
  await request(valuesUrl(`${TAB.TX}!A${row}:F${row}`, `?${qs({ valueInputOption: 'RAW' })}`), { method: 'PUT', body: { values: [txRow(tx)] } });
  return { transaction: tx };
};
export const updateTransaction = (p) => serialize(() => updateTransactionRaw(p));

/** Idempoten: menghapus ID yang sudah tidak ada dianggap berhasil. */
const deleteTransactionRaw = async (id) => {
  const row = rowOf(await readIds(), String(id));
  if (row < 0) return { id, deleted: false };
  await deleteRow(TAB.TX, row);
  return { id, deleted: true };
};
export const deleteTransaction = (id) => serialize(() => deleteTransactionRaw(id));

// ---------- budget ----------
const BUDGET_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const upsertBudgets = (items) => serialize(async () => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw fail('VALIDATION', 'Kirim 1 sampai 50 item budget.');
  const [bud, cat] = await readRanges([`${TAB.BUDGET}!A2:C`, `${TAB.CAT}!A2:C`]);
  const expense = new Set(parseCategories(cat).filter((c) => c.tipe === TX_TYPE.EXPENSE).map((c) => c.nama));

  const clean = items.map((it) => {
    const bulan = String(it?.bulan || '').trim();
    const kategori = String(it?.kategori || '').trim();
    const budget = it?.budget;
    const y = Number(bulan.slice(0, 4));
    const errs = [];
    if (!BUDGET_MONTH.test(bulan) || y < LIMITS.minYear || y > LIMITS.maxYear) errs.push('Bulan budget tidak valid.');
    if (!expense.has(kategori)) errs.push(`Budget hanya untuk kategori Pengeluaran yang terdaftar: "${kategori}".`);
    if (!Number.isInteger(budget) || budget <= 0 || budget > LIMITS.maxAmount) errs.push('Budget harus bilangan bulat lebih besar dari 0.');
    if (errs.length) throw fail('VALIDATION', errs.join(' '));
    return { bulan, kategori, budget };
  }); // validasi semua dulu: semua-atau-tidak-sama-sekali

  const rowByKey = new Map();
  for (const b of parseBudgets(bud)) if (!rowByKey.has(`${b.bulan}|${b.kategori}`)) rowByKey.set(`${b.bulan}|${b.kategori}`, b._row);

  const updates = [];
  const additions = [];
  for (const b of clean) {
    const row = rowByKey.get(`${b.bulan}|${b.kategori}`);
    if (row) updates.push({ range: `${TAB.BUDGET}!C${row}`, values: [[b.budget]] });
    else { additions.push(b); rowByKey.set(`${b.bulan}|${b.kategori}`, -1); }
  }

  if (updates.length) {
    await request(`${SHEETS_URL}/${sid()}/values:batchUpdate`, { method: 'POST', body: { valueInputOption: 'RAW', data: updates } });
  }
  if (additions.length) {
    const resp = await request(valuesUrl(`${TAB.BUDGET}!A:C`, `:append?${qs({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })}`), {
      method: 'POST', retry: false, body: { values: additions.map((b) => [monthToSerial(b.bulan), b.kategori, b.budget]) },
    });
    const [first, last] = updatedRows(resp);
    const formulas = [];
    for (let r = first; r <= last; r++) formulas.push(budgetFormulas(r));
    await request(valuesUrl(`${TAB.BUDGET}!D${first}:F${last}`, `?${qs({ valueInputOption: 'USER_ENTERED' })}`), { method: 'PUT', body: { values: formulas } });
  }
  return { budgets: clean };
});

export const deleteBudget = (bulan, kategori) => serialize(async () => {
  const [bud] = await readRanges([`${TAB.BUDGET}!A2:C`]);
  const hit = parseBudgets(bud).find((b) => b.bulan === bulan && b.kategori === kategori);
  if (!hit) return { bulan, kategori, deleted: false };
  await deleteRow(TAB.BUDGET, hit._row);
  return { bulan, kategori, deleted: true };
});

// ---------- kategori ----------
export const createCategory = (nama, tipe) => serialize(async () => {
  const name = String(nama || '').trim();
  const errs = [];
  if (!name) errs.push('Nama kategori wajib diisi.');
  if (name.length > LIMITS.maxCategoryLength) errs.push('Nama kategori terlalu panjang.');
  if (/^[=+\-@]/.test(name)) errs.push('Nama kategori tidak boleh diawali = + - atau @.');
  if (!TX_TYPES.includes(tipe)) errs.push('Tipe kategori tidak valid.');
  const [cat] = await readRanges([`${TAB.CAT}!A2:C`]);
  const all = parseCategories(cat);
  if (all.some((c) => c.nama.toLowerCase() === name.toLowerCase())) errs.push('Nama kategori sudah ada.');
  if (errs.length) throw fail('VALIDATION', errs.join(' '));
  await request(valuesUrl(`${TAB.CAT}!A:C`, `:append?${qs({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })}`), {
    method: 'POST', retry: false, body: { values: [[name, tipe, true]] },
  });
  return { categories: [...all.map(strip), { nama: name, tipe, aktif: true }] };
});

export const setCategoryActive = (nama, aktif) => serialize(async () => {
  const [cat] = await readRanges([`${TAB.CAT}!A2:C`]);
  const all = parseCategories(cat);
  const hit = all.find((c) => c.nama === String(nama).trim());
  if (!hit) throw fail('NOT_FOUND', 'Kategori tidak ditemukan.');
  await request(valuesUrl(`${TAB.CAT}!C${hit._row}`, `?${qs({ valueInputOption: 'RAW' })}`), { method: 'PUT', body: { values: [[aktif === true]] } });
  return { categories: all.map((c) => strip({ ...c, aktif: c.nama === hit.nama ? aktif === true : c.aktif })) };
});

// ---------- diagnostik ----------
export async function checkConnection() {
  const started = Date.now();
  const meta = await request(`${SHEETS_URL}/${sid()}?${qs({ fields: 'properties.title,spreadsheetUrl,sheets.properties.title' })}`);
  return {
    title: meta.properties?.title || '',
    url: meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sid()}`,
    tabs: (meta.sheets || []).map((s) => s.properties.title),
    latencyMs: Date.now() - started,
  };
}

/** Uji tulis/baca/ubah/hapus nyata dengan satu baris sementara. */
export const selfTest = () => serialize(async () => {
  const steps = [];
  const step = (name, ok, detail = '') => { steps.push({ name, ok: !!ok, detail }); return ok; };
  const [cat] = await readRanges([`${TAB.CAT}!A2:C`]);
  const category = parseCategories(cat).find((c) => c.tipe === TX_TYPE.EXPENSE && c.aktif);
  if (!step('Menemukan kategori Pengeluaran aktif', category, category ? category.nama : 'Tidak ada kategori Pengeluaran aktif')) {
    return { steps, user: ctx.email, passed: false };
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tx = { id: `txn_selftest-${uuid}`, tanggal: today, kategori: category.nama, tipe: TX_TYPE.EXPENSE, nominal: 1, catatan: 'uji koneksi (otomatis dihapus)' };

  try {
    await createTransactionRaw(tx);
    step('Menulis baris baru', rowOf(await readIds(), tx.id) > 0);
    const again = await createTransactionRaw(tx);
    step('Kirim ulang ID yang sama tidak membuat duplikat', again.duplicate === true);
    const back = (await bootstrap()).transactions.find((t) => t.id === tx.id);
    step('Membaca kembali data yang ditulis', back && back.nominal === 1 && back.tanggal === today, back ? back.tanggal : 'tidak ditemukan');
    await updateTransactionRaw({ ...tx, nominal: 2 });
    const upd = (await bootstrap()).transactions.find((t) => t.id === tx.id);
    step('Mengubah baris', upd && upd.nominal === 2);
  } finally {
    const del = await deleteTransactionRaw(tx.id);
    step('Menghapus baris uji', del.deleted === true && rowOf(await readIds(), tx.id) < 0);
  }
  return { steps, user: ctx.email, passed: steps.every((s) => s.ok) };
});
