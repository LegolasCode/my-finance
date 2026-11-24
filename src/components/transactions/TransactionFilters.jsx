import { Search, X } from 'lucide-react';
import { MONTHS, TX_TYPES } from '../../lib/constants.js';
import Button from '../ui/Button.jsx';

export default function TransactionFilters({ filters, onChange, categoryNames, years, onReset }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <div className="relative col-span-2 lg:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input aria-label="Cari transaksi" className="comic-input pl-9" placeholder="Cari catatan atau kategori…" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
      </div>
      <select aria-label="Filter bulan" className="comic-input" value={filters.month} onChange={(e) => set({ month: e.target.value })}>
        <option value="all">Semua bulan</option>
        {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
      </select>
      <select aria-label="Filter tahun" className="comic-input" value={filters.year} onChange={(e) => set({ year: e.target.value })}>
        <option value="all">Semua tahun</option>
        {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
      </select>
      <select aria-label="Filter kategori" className="comic-input col-span-2 lg:col-span-1" value={filters.kategori} onChange={(e) => set({ kategori: e.target.value })}>
        <option value="all">Semua kategori</option>
        {categoryNames.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <div className="col-span-2 flex gap-2 lg:col-span-1">
        <select aria-label="Filter tipe" className="comic-input" value={filters.tipe} onChange={(e) => set({ tipe: e.target.value })}>
          <option value="all">Semua tipe</option>
          {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button variant="secondary" size="sm" onClick={onReset} aria-label="Atur ulang filter" title="Atur ulang filter" className="!px-2.5"><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
