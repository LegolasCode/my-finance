import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { formatIDR, formatPercent, formatThousands } from '../../lib/format.js';
import { parseAmountText, validateBudget } from '../../lib/validators.js';
import Button from '../ui/Button.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

function Stat({ label, value, danger }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider comic-muted">{label}</p>
      <p className={`comic-num text-sm ${danger ? 'underline decoration-expense decoration-[3px] underline-offset-2' : ''}`}>{value}</p>
    </div>
  );
}

export default function BudgetRow({ kategori, row, unbudgetedActual, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => { setText(row ? formatThousands(row.budget) : ''); setError(''); setEditing(true); };

  const save = async (e) => {
    e.preventDefault();
    const budget = parseAmountText(text);
    const errs = validateBudget({ budget });
    if (errs.budget) { setError(errs.budget); return; }
    setSaving(true);
    try {
      await onSave(kategori, budget);
      setEditing(false);
    } catch {
      // toast galat sudah tampil
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="comic-display text-xl uppercase leading-none">{kategori}</p>
        {row ? (
          <span className="flex items-center gap-2">
            <span className="comic-num text-xs">{formatPercent(row.percent, 0)}</span>
            <StatusBadge status={row.status} />
          </span>
        ) : (
          <span className="text-xs font-bold uppercase comic-muted">Belum ada budget</span>
        )}
      </div>

      {row && <div className="mt-2.5"><ProgressBar percent={row.percent} tone={row.status.tone} /></div>}

      {editing ? (
        <form onSubmit={save} className="mt-3 flex flex-wrap items-start gap-2" noValidate>
          <div className="min-w-[10rem] flex-1">
            <input
              autoFocus
              inputMode="numeric"
              aria-label={`Budget ${kategori}`}
              placeholder="Budget (Rp)"
              className={`comic-input comic-input--mono ${error ? 'is-invalid' : ''}`}
              value={text}
              onChange={(e) => { setText(e.target.value.replace(/[^\d.\-]/g, '')); setError(''); }}
            />
            {error && <p className="comic-error" role="alert">{error}</p>}
          </div>
          <Button type="submit" loading={saving}>Simpan</Button>
          <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Batal</Button>
        </form>
      ) : row ? (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            <Stat label="Budget" value={formatIDR(row.budget)} />
            <Stat label="Aktual" value={formatIDR(row.actual)} />
            <Stat label={row.remaining < 0 ? 'Melebihi' : 'Sisa'} value={formatIDR(Math.abs(row.remaining))} danger={row.remaining < 0} />
          </div>
          <div className="flex gap-2">
            <Button variant="sky" size="sm" icon={Pencil} onClick={startEdit}>Ubah</Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => onDelete(kategori)} aria-label={`Hapus budget ${kategori}`} />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium comic-muted">
            {unbudgetedActual > 0 ? `Pengeluaran bulan ini ${formatIDR(unbudgetedActual)} (belum dibatasi budget)` : 'Belum ada pengeluaran bulan ini'}
          </p>
          <Button variant="primary" size="sm" icon={Plus} onClick={startEdit}>Atur budget</Button>
        </div>
      )}
    </li>
  );
}
