import { MONTHS, MONTHS_SHORT } from './constants.js';

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const thousands = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const formatIDR = (n) => idr.format(Number.isFinite(n) ? n : 0);
export const formatCompact = (n) => compact.format(Number.isFinite(n) ? n : 0);
export const formatThousands = (n) => (Number.isFinite(n) ? thousands.format(n) : '');

export function formatPercent(n, digits = 1) {
  if (n === Infinity) return '>100%';
  if (!Number.isFinite(n)) return '0%';
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: digits })}%`;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** '2026-11-21' -> '21 Nov 2026' (tanpa objek Date, jadi bebas masalah zona waktu). */
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '-';
  return `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const monthLabel = (year, month) => `${MONTHS[month - 1]} ${year}`;

export function newId() {
  const uuid = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `txn_${uuid}`;
}
