import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { TX_TYPES, TX_TYPE_META } from '../../lib/constants.js';
import { validateCategoryName } from '../../lib/validators.js';
import Button from '../ui/Button.jsx';

export default function CategoryManager() {
  const { categories, addCategory, toggleCategory } = useFinance();
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState(TX_TYPES[1]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const msg = validateCategoryName(nama, categories.map((c) => c.nama));
    if (msg) { setError(msg); return; }
    setSaving(true);
    try {
      await addCategory(nama.trim(), tipe);
      setNama('');
      setError('');
    } catch {
      // toast galat sudah tampil
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    setBusy(c.nama);
    try { await toggleCategory(c.nama, !c.aktif); } catch { /* toast galat sudah tampil */ } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-3">
        {TX_TYPES.map((t) => {
          const items = categories.filter((c) => c.tipe === t);
          return (
            <div key={t}>
              <h3 className={`comic-badge tone-${TX_TYPE_META[t].tone} mb-2`}>{t}</h3>
              <ul className="space-y-2">
                {items.map((c) => (
                  <li key={c.nama} className="flex items-center justify-between gap-2 rounded-lg border-2 border-ink bg-surface px-3 py-2">
                    <span className={`truncate text-sm font-bold ${c.aktif ? '' : 'comic-muted line-through'}`}>{c.nama}</span>
                    <button
                      onClick={() => toggle(c)}
                      disabled={busy === c.nama}
                      role="switch"
                      aria-checked={c.aktif}
                      aria-label={`${c.aktif ? 'Nonaktifkan' : 'Aktifkan'} kategori ${c.nama}`}
                      className="comic-switch"
                    />
                  </li>
                ))}
                {items.length === 0 && <li className="text-xs font-medium comic-muted">Belum ada kategori.</li>}
              </ul>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-start gap-2 border-t-[3px] border-ink pt-4" noValidate>
        <div className="min-w-[10rem] flex-1">
          <input aria-label="Nama kategori baru" className={`comic-input ${error ? 'is-invalid' : ''}`} placeholder="Nama kategori baru" value={nama} maxLength={40} onChange={(e) => { setNama(e.target.value); setError(''); }} />
          {error && <p className="comic-error" role="alert">{error}</p>}
        </div>
        <select aria-label="Tipe kategori" className="comic-input comic-input--auto font-bold" value={tipe} onChange={(e) => setTipe(e.target.value)}>
          {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button type="submit" icon={Plus} loading={saving}>Tambah</Button>
      </form>
      <p className="text-xs font-medium comic-muted">Kategori tidak dihapus, hanya dinonaktifkan. Kategori nonaktif tidak muncul di form baru, tetapi transaksi lama tetap utuh.</p>
    </div>
  );
}
