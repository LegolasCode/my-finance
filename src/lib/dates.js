// Google Sheets menyimpan tanggal sebagai nomor seri (hari sejak 30 Des 1899).
// Memakai nomor seri membuat tanggal bebas masalah zona waktu dan locale.
const EPOCH = Date.UTC(1899, 11, 30);
const DAY = 86_400_000;
const pad2 = (n) => String(n).padStart(2, '0');

export function isoToSerial(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);
}

export function serialToIso(value) {
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : '';
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const dt = new Date(EPOCH + Math.floor(value) * DAY);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** 'yyyy-MM' -> nomor seri tanggal 1 bulan tsb. */
export const monthToSerial = (ym) => isoToSerial(`${ym}-01`);
