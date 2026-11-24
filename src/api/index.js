import * as sheets from './sheets.js';

export { ApiError, setTokenProvider } from './google.js';
export { ensureWorkspace } from './workspace.js';
export { bindSpreadsheet } from './sheets.js';

/** Antarmuka data untuk UI. Semuanya langsung ke Google Sheets milik pengguna. */
export const api = {
  ping: sheets.checkConnection,
  bootstrap: sheets.bootstrap,
  selfTest: sheets.selfTest,

  createTransaction: (tx) => sheets.createTransaction(tx).then((r) => r.transaction),
  updateTransaction: (tx) => sheets.updateTransaction(tx).then((r) => r.transaction),
  deleteTransaction: sheets.deleteTransaction,

  upsertBudgets: (items) => sheets.upsertBudgets(items).then((r) => r.budgets),
  deleteBudget: sheets.deleteBudget,

  createCategory: (nama, tipe) => sheets.createCategory(nama, tipe).then((r) => r.categories),
  setCategoryActive: (nama, aktif) => sheets.setCategoryActive(nama, aktif).then((r) => r.categories),
};
