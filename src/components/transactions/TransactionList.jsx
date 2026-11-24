import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { TX_TYPE_META } from '../../lib/constants.js';
import { formatDate, formatIDR } from '../../lib/format.js';
import { TypeBadge } from '../ui/StatusBadge.jsx';

const metaOf = (t) => TX_TYPE_META[t.tipe] || TX_TYPE_META.Pengeluaran;
const amountText = (t) => `${metaOf(t).sign}${formatIDR(t.nominal)}`;
const rowStyle = (t) => ({ '--row-color': `var(--c-${metaOf(t).tone})` });

function Actions({ tx, onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1.5">
      <button onClick={() => onEdit(tx)} className="comic-btn comic-btn--sm tone-secondary !p-1.5" aria-label={`Ubah transaksi ${tx.kategori}`}><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={() => onDelete(tx)} className="comic-btn comic-btn--sm tone-expense !p-1.5" aria-label={`Hapus transaksi ${tx.kategori}`}><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export default function TransactionList({ items, sortDir, onToggleSort, onEdit, onDelete }) {
  const SortIcon = sortDir === 'desc' ? ArrowDown : ArrowUp;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="comic-table">
          <thead>
            <tr>
              <th><button onClick={onToggleSort} className="inline-flex items-center gap-1 uppercase">Tanggal <SortIcon className="h-3.5 w-3.5" /></button></th>
              <th>Kategori</th>
              <th>Tipe</th>
              <th>Catatan</th>
              <th className="text-right">Nominal</th>
              <th><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="row-tone" style={rowStyle(t)}>
                <td className="comic-num whitespace-nowrap text-[13px]">{formatDate(t.tanggal)}</td>
                <td className="font-bold">{t.kategori}</td>
                <td><TypeBadge meta={metaOf(t)} /></td>
                <td className="max-w-[16rem] truncate comic-muted" title={t.catatan}>{t.catatan || '—'}</td>
                <td className="comic-num whitespace-nowrap text-right">{amountText(t)}</td>
                <td className="w-24"><Actions tx={t} onEdit={onEdit} onDelete={onDelete} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="comic-divide md:hidden">
        {items.map((t) => (
          <li key={t.id} className="row-tone-item flex items-start gap-3 px-4 py-3" style={rowStyle(t)}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold">{t.kategori}</p>
                <TypeBadge meta={metaOf(t)} />
              </div>
              <p className="mt-1 text-xs comic-muted"><span className="comic-num">{formatDate(t.tanggal)}</span>{t.catatan ? ` · ${t.catatan}` : ''}</p>
            </div>
            <div className="shrink-0 space-y-2 text-right">
              <p className="comic-num text-sm">{amountText(t)}</p>
              <Actions tx={t} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
