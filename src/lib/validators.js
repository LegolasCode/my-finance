import { LIMITS, TX_TYPES } from './constants.js';

/**
 * Mengubah teks nominal ("1.500.000") menjadi angka.
 * Mengembalikan NaN untuk teks kosong/tidak valid, dan -1 untuk angka negatif
 * (dipakai validator untuk memberi pesan yang tepat).
 */
export function parseAmountText(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return NaN;
  if (raw.startsWith('-')) return -1;
  const cleaned = raw.replace(/[.\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

export function isValidISODate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < LIMITS.minYear || y > LIMITS.maxYear) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * @param input {tanggal, kategori, tipe, nominal(number|NaN), catatan}
 * @param allowedCategories nama kategori yang valid untuk `tipe` terpilih
 * @returns objek error per field; kosong berarti valid
 */
export function validateTransaction(input, allowedCategories = []) {
  const errors = {};
  if (!isValidISODate(input.tanggal)) errors.tanggal = 'Tanggal tidak valid.';
  if (!TX_TYPES.includes(input.tipe)) errors.tipe = 'Pilih tipe transaksi.';
  if (!input.kategori) errors.kategori = 'Pilih kategori.';
  else if (!allowedCategories.includes(input.kategori)) errors.kategori = 'Kategori tidak sesuai dengan tipe transaksi.';

  const n = input.nominal;
  if (n === -1 || (typeof n === 'number' && n < 0)) errors.nominal = 'Nominal tidak boleh negatif.';
  else if (!Number.isFinite(n)) errors.nominal = 'Nominal wajib diisi dengan angka.';
  else if (!Number.isInteger(n) || n <= 0) errors.nominal = 'Nominal harus lebih besar dari 0.';
  else if (n > LIMITS.maxAmount) errors.nominal = 'Nominal terlalu besar.';

  if ((input.catatan || '').length > LIMITS.maxNoteLength) {
    errors.catatan = `Catatan maksimal ${LIMITS.maxNoteLength} karakter.`;
  }
  return errors;
}

export function validateBudget({ budget }) {
  const errors = {};
  if (budget === -1 || (typeof budget === 'number' && budget < 0)) errors.budget = 'Budget tidak boleh negatif.';
  else if (!Number.isFinite(budget) || !Number.isInteger(budget) || budget <= 0) errors.budget = 'Budget harus berupa angka lebih besar dari 0.';
  else if (budget > LIMITS.maxAmount) errors.budget = 'Budget terlalu besar.';
  return errors;
}

export function validateCategoryName(name, existingNames = []) {
  const v = String(name || '').trim();
  if (!v) return 'Nama kategori wajib diisi.';
  if (v.length > LIMITS.maxCategoryLength) return `Nama kategori maksimal ${LIMITS.maxCategoryLength} karakter.`;
  if (/^[=+\-@]/.test(v)) return 'Nama kategori tidak boleh diawali = + - atau @.';
  if (existingNames.some((n) => n.toLowerCase() === v.toLowerCase())) return 'Nama kategori sudah ada.';
  return '';
}
