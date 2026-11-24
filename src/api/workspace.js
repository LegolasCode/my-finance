/**
 * Membuat/menemukan spreadsheet milik pengguna di Google Drive-nya sendiri dan menyiapkan strukturnya.
 * Scope `drive.file` hanya memberi akses ke file yang dibuat aplikasi ini, tidak ke file lain.
 */
import { request, qs } from './google.js';
import { DEFAULT_CATEGORIES } from '../lib/constants.js';
import { monthToSerial } from '../lib/dates.js';

export const SHEETS_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
export const DRIVE_URL = 'https://www.googleapis.com/drive/v3/files';
export const APP_PROP = { key: 'pft_app', value: 'finance-tracker' };
export const FILE_NAME = 'Pengatur Keuangan';

export const TAB = { TX: 'Transaksi', BUDGET: 'Budget', DASH: 'Dashboard', CAT: 'Kategori' };
export const TX_HEADERS = ['ID', 'Tanggal', 'Kategori', 'Tipe', 'Nominal', 'Catatan'];
export const BUDGET_HEADERS = ['Bulan', 'Kategori', 'Budget', 'Pengeluaran Aktual', 'Sisa Budget', 'Status'];
export const CAT_HEADERS = ['Nama', 'Tipe', 'Aktif'];
const TABS_IN_ORDER = [TAB.TX, TAB.BUDGET, TAB.DASH, TAB.CAT];

/** Rumus kolom D-F sheet Budget (hanya tampilan; aplikasi menghitung sendiri dari data mentah). */
export function budgetFormulas(row) {
  return [
    `=SUMIFS(Transaksi!$E$2:$E,Transaksi!$C$2:$C,B${row},Transaksi!$D$2:$D,"Pengeluaran",Transaksi!$B$2:$B,">="&$A${row},Transaksi!$B$2:$B,"<="&EOMONTH($A${row},0))`,
    `=C${row}-D${row}`,
    `=IF(AND(C${row}=0,D${row}=0),"Aman",IF(D${row}>C${row},"Over Budget",IF(D${row}=C${row},"Habis",IF(D${row}*100>=C${row}*80,"Hampir Habis","Aman"))))`,
  ];
}

const driveEnc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function findExisting(cachedId) {
  const q = `appProperties has { key='${driveEnc(APP_PROP.key)}' and value='${driveEnc(APP_PROP.value)}' } and trashed=false and mimeType='application/vnd.google-apps.spreadsheet'`;
  const list = await request(`${DRIVE_URL}?${qs({ q, fields: 'files(id,name,createdTime)', orderBy: 'createdTime', pageSize: 10, spaces: 'drive' })}`);
  if (list?.files?.length) return list.files[0].id; // yang tertua, deterministik
  if (cachedId) {
    try {
      const f = await request(`${DRIVE_URL}/${cachedId}?${qs({ fields: 'id,trashed' })}`);
      if (f && !f.trashed) return f.id;
    } catch (e) {
      if (!['NOT_FOUND', 'FORBIDDEN'].includes(e.code)) throw e;
    }
  }
  return null;
}

async function createSpreadsheet() {
  const f = await request(`${DRIVE_URL}?${qs({ fields: 'id' })}`, {
    method: 'POST',
    retry: false,
    body: { name: FILE_NAME, mimeType: 'application/vnd.google-apps.spreadsheet', appProperties: { [APP_PROP.key]: APP_PROP.value, schema: '1' } },
  });
  return f.id;
}

// ---------- pembangun request pemformatan (Sheets API batchUpdate) ----------
const INK = { red: 0.094, green: 0.094, blue: 0.106 };
const YELLOW = { red: 1, green: 0.839, blue: 0 };
const gr = (sheetId, r0, r1, c0, c1) => ({ sheetId, startRowIndex: r0, ...(r1 != null ? { endRowIndex: r1 } : {}), startColumnIndex: c0, endColumnIndex: c1 });
const fmt = (sheetId, r0, r1, c0, c1, userEnteredFormat, fields) => ({ repeatCell: { range: gr(sheetId, r0, r1, c0, c1), cell: { userEnteredFormat }, fields } });
const numFmt = (sheetId, r0, r1, c0, c1, type, pattern) => fmt(sheetId, r0, r1, c0, c1, { numberFormat: { type, pattern } }, 'userEnteredFormat.numberFormat');
const header = (sheetId, r, c1) => fmt(sheetId, r, r + 1, 0, c1, { backgroundColor: YELLOW, textFormat: { bold: true, foregroundColor: INK }, horizontalAlignment: 'LEFT' }, 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)');
const freeze = (sheetId) => ({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } });
const width = (sheetId, c0, c1, px) => ({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: c0, endIndex: c1 }, properties: { pixelSize: px }, fields: 'pixelSize' } });
const list = (sheetId, r0, c, values) => ({ setDataValidation: { range: gr(sheetId, r0, null, c, c + 1), rule: { condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) }, strict: true, showCustomUi: true } } });
const fromRange = (sheetId, r0, c, ref) => ({ setDataValidation: { range: gr(sheetId, r0, null, c, c + 1), rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: ref }] }, strict: true, showCustomUi: true } } });
const STATUS_COLORS = { Aman: [0.29, 0.87, 0.5], 'Hampir Habis': [1, 0.84, 0], Habis: [0.75, 0.52, 0.99], 'Over Budget': [1, 0.37, 0.36] };
const statusRules = (sheetId, col, r0) => Object.entries(STATUS_COLORS).map(([label, [red, green, blue]]) => ({
  addConditionalFormatRule: { index: 0, rule: { ranges: [gr(sheetId, r0, null, col, col + 1)], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: label }] }, format: { backgroundColor: { red, green, blue } } } } },
}));

const RP = '"Rp"#,##0';

function formattingRequests(ids, fresh) {
  const reqs = [];
  if (fresh.has(TAB.TX)) {
    const s = ids[TAB.TX];
    reqs.push(freeze(s), header(s, 0, 6), numFmt(s, 1, null, 1, 2, 'DATE', 'dd/mm/yyyy'), numFmt(s, 1, null, 4, 5, 'NUMBER', RP),
      fmt(s, 1, null, 5, 6, { numberFormat: { type: 'TEXT' } }, 'userEnteredFormat.numberFormat'),
      list(s, 1, 3, ['Pemasukan', 'Pengeluaran', 'Tabungan']), fromRange(s, 1, 2, '=Kategori!$A$2:$A'),
      width(s, 0, 1, 250), width(s, 1, 5, 140), width(s, 5, 6, 300));
  }
  if (fresh.has(TAB.BUDGET)) {
    const s = ids[TAB.BUDGET];
    reqs.push(freeze(s), header(s, 0, 6), numFmt(s, 1, null, 0, 1, 'DATE', 'mmmm yyyy'), numFmt(s, 1, null, 2, 5, 'NUMBER', RP),
      width(s, 0, 6, 150), ...statusRules(s, 5, 1));
  }
  if (fresh.has(TAB.CAT)) {
    const s = ids[TAB.CAT];
    reqs.push(freeze(s), header(s, 0, 3), width(s, 0, 3, 180));
  }
  if (fresh.has(TAB.DASH)) {
    const s = ids[TAB.DASH];
    reqs.push(
      fmt(s, 0, 1, 0, 1, { textFormat: { bold: true, fontSize: 14 } }, 'userEnteredFormat.textFormat'),
      fmt(s, 1, 2, 1, 2, { backgroundColor: YELLOW, numberFormat: { type: 'DATE', pattern: 'mmmm yyyy' } }, 'userEnteredFormat(backgroundColor,numberFormat)'),
      header(s, 3, 6), header(s, 7, 5),
      numFmt(s, 4, 5, 0, 4, 'NUMBER', RP), numFmt(s, 4, 5, 4, 5, 'PERCENT', '0.0%'), numFmt(s, 4, 5, 5, 6, 'NUMBER', RP),
      numFmt(s, 8, 60, 1, 4, 'NUMBER', RP), width(s, 0, 6, 170), ...statusRules(s, 4, 8),
    );
  }
  return reqs;
}

function dashboardValues() {
  const start = 'EOMONTH($B$2,-1)+1';
  const end = 'EOMONTH($B$2,0)';
  const sumType = (t) => `=SUMIFS(Transaksi!$E$2:$E,Transaksi!$D$2:$D,"${t}",Transaksi!$B$2:$B,">="&${start},Transaksi!$B$2:$B,"<="&${end})`;
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return [
    { range: `${TAB.DASH}!A1`, values: [['PENGATUR KEUANGAN PRIBADI']] },
    { range: `${TAB.DASH}!A2:B2`, values: [['Periode (isi tanggal 1 pada bulan yang ingin dilihat):', monthToSerial(ym)]] },
    { range: `${TAB.DASH}!A4:F4`, values: [['TOTAL PEMASUKAN', 'TOTAL PENGELUARAN', 'SALDO AKHIR', 'TOTAL TABUNGAN', 'SAVING RATE', 'SISA BUDGET']] },
    { range: `${TAB.DASH}!A5:F5`, values: [[sumType('Pemasukan'), sumType('Pengeluaran'), '=A5-B5-D5', sumType('Tabungan'), '=IFERROR(D5/A5,0)', `=SUMIFS(Budget!$E$2:$E,Budget!$A$2:$A,${start})`]] },
    { range: `${TAB.DASH}!A7`, values: [['Realisasi Anggaran per Kategori']] },
    { range: `${TAB.DASH}!A8:E8`, values: [['Kategori', 'Budget', 'Realisasi', 'Sisa Budget', 'Status']] },
    { range: `${TAB.DASH}!A9`, values: [[`=IFERROR(FILTER(Budget!B2:F,Budget!A2:A=${start}),"Belum ada budget untuk periode ini")`]] },
    { range: `${TAB.DASH}!A63`, values: [['Catatan: sheet ini hanya tampilan. Gunakan aplikasi web untuk mencatat dan mengubah data.']] },
  ];
}

/** Idempoten: menambah tab yang hilang dan menyiapkan tab baru; tidak menimpa data/format yang sudah ada. */
export async function initializeStructure(id) {
  const metaUrl = `${SHEETS_URL}/${id}?${qs({ fields: 'properties.locale,sheets.properties(sheetId,title)' })}`;
  const meta = await request(metaUrl);
  const existing = (meta.sheets || []).map((s) => s.properties);
  const has = (t) => existing.some((p) => p.title === t);

  const reqs = [];
  // Rumus ditulis dalam sintaks en_US; mengunci locale membuatnya terbaca benar di semua negara.
  if (meta.properties?.locale !== 'en_US') reqs.push({ updateSpreadsheetProperties: { properties: { locale: 'en_US' }, fields: 'locale' } });
  const loneDefault = existing.length === 1 && !has(TAB.TX);
  if (loneDefault) reqs.push({ updateSheetProperties: { properties: { sheetId: existing[0].sheetId, title: TAB.TX }, fields: 'title' } });
  for (const t of TABS_IN_ORDER) {
    if (!has(t) && !(t === TAB.TX && loneDefault)) reqs.push({ addSheet: { properties: { title: t } } });
  }
  if (reqs.length) await request(`${SHEETS_URL}/${id}:batchUpdate`, { method: 'POST', body: { requests: reqs } });

  const after = reqs.length ? await request(metaUrl) : meta;
  const ids = Object.fromEntries((after.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]));

  // Tab yang header-nya masih kosong dianggap baru.
  const probe = await request(`${SHEETS_URL}/${id}/values:batchGet?${qs({
    ranges: [`${TAB.TX}!A1`, `${TAB.BUDGET}!A1`, `${TAB.CAT}!A1`, `${TAB.DASH}!A1`], valueRenderOption: 'UNFORMATTED_VALUE',
  })}`);
  const fresh = new Set(TABS_IN_ORDER.filter((t, i) => {
    const order = [TAB.TX, TAB.BUDGET, TAB.CAT, TAB.DASH];
    return !(probe.valueRanges?.[order.indexOf(t)]?.values?.[0]?.[0]);
  }));
  if (!fresh.size) return { sheetIds: ids, initialized: false };

  const raw = [];
  if (fresh.has(TAB.TX)) raw.push({ range: `${TAB.TX}!A1:F1`, values: [TX_HEADERS] });
  if (fresh.has(TAB.BUDGET)) raw.push({ range: `${TAB.BUDGET}!A1:F1`, values: [BUDGET_HEADERS] });
  if (fresh.has(TAB.CAT)) {
    raw.push({ range: `${TAB.CAT}!A1:C1`, values: [CAT_HEADERS] });
    raw.push({ range: `${TAB.CAT}!A2:C${1 + DEFAULT_CATEGORIES.length}`, values: DEFAULT_CATEGORIES.map(([n, t]) => [n, t, true]) });
  }
  if (raw.length) await request(`${SHEETS_URL}/${id}/values:batchUpdate`, { method: 'POST', body: { valueInputOption: 'RAW', data: raw } });
  if (fresh.has(TAB.DASH)) await request(`${SHEETS_URL}/${id}/values:batchUpdate`, { method: 'POST', body: { valueInputOption: 'USER_ENTERED', data: dashboardValues() } });

  const fmtReqs = formattingRequests(ids, fresh);
  if (fmtReqs.length) await request(`${SHEETS_URL}/${id}:batchUpdate`, { method: 'POST', body: { requests: fmtReqs } });
  return { sheetIds: ids, initialized: true };
}

/**
 * Alur setelah login: cari spreadsheet milik aplikasi di Drive pengguna -> buat bila belum ada -> siapkan struktur.
 * @returns {{spreadsheetId, spreadsheetUrl, created}}
 */
export async function ensureWorkspace({ cachedId, onStep = () => {} } = {}) {
  onStep('find');
  let id = await findExisting(cachedId);
  let created = false;
  if (!id) {
    onStep('create');
    id = await createSpreadsheet();
    created = true;
  }
  onStep('setup');
  await initializeStructure(id);
  return { spreadsheetId: id, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}`, created };
}
