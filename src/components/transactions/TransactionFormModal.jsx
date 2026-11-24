import { useRef, useState } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { TX_TYPES, TX_TYPE_META } from '../../lib/constants.js';
import { formatIDR, formatThousands, newId, todayISO } from '../../lib/format.js';
import { parseAmountText, validateTransaction } from '../../lib/validators.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

export default function TransactionFormModal({ initial, lastTipe, onClose, onSaved }) {
  const { categories, addTransaction, editTransaction } = useFinance();
  const editing = Boolean(initial);

  // ID dibuat sekali per form: kirim ulang saat jaringan bermasalah tidak membuat transaksi ganda.
  const [draftId, setDraftId] = useState(() => initial?.id || newId());

  const optionsFor = (tipe) => categories
    .filter((c) => c.tipe === tipe && (c.aktif || (editing && initial.kategori === c.nama && initial.tipe === tipe)))
    .map((c) => c.nama);

  const [form, setForm] = useState(() => {
    const tipe = initial?.tipe || lastTipe || TX_TYPES[1];
    return {
      tanggal: initial?.tanggal || todayISO(),
      tipe,
      kategori: initial?.kategori || optionsFor(tipe)[0] || '',
      nominalText: initial ? formatThousands(initial.nominal) : '',
      catatan: initial?.catatan || '',
    };
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);

  const options = optionsFor(form.tipe);
  const amount = parseAmountText(form.nominalText);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const changeTipe = (tipe) => set({ tipe, kategori: optionsFor(tipe)[0] || '' });

  const submit = async (keepOpen = false) => {
    const payload = { id: draftId, tanggal: form.tanggal, tipe: form.tipe, kategori: form.kategori, nominal: amount, catatan: form.catatan.trim() };
    const errs = validateTransaction(payload, options);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const saved = editing ? await editTransaction(payload) : await addTransaction(payload);
      onSaved?.(saved);
      if (keepOpen) {
        setDraftId(newId());
        set({ nominalText: '', catatan: '' });
        setErrors({});
        amountRef.current?.focus();
      } else {
        onClose();
      }
    } catch {
      // Pesan galat sudah ditampilkan sebagai toast; form tetap terbuka agar bisa dicoba lagi.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Ubah Transaksi' : 'Tambah Transaksi'}
      onClose={onClose}
      disableClose={saving}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
          {!editing && <Button variant="sky" onClick={() => submit(true)} disabled={saving}>Simpan &amp; tambah lagi</Button>}
          <Button type="submit" form="tx-form" loading={saving}>Simpan</Button>
        </>
      )}
    >
      <form id="tx-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(false); }} noValidate>
        <FormField label="Tipe transaksi" error={errors.tipe}>
          <div className="grid grid-cols-3 gap-2">
            {TX_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={form.tipe === t}
                onClick={() => changeTipe(t)}
                className={`comic-btn comic-btn--sm justify-center ${form.tipe === t ? `tone-${TX_TYPE_META[t].tone}` : ''}`}
              >
                {TX_TYPE_META[t].label}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tanggal" htmlFor="tx-date" error={errors.tanggal}>
            <input id="tx-date" type="date" className={`comic-input comic-input--mono ${errors.tanggal ? 'is-invalid' : ''}`} value={form.tanggal} onChange={(e) => set({ tanggal: e.target.value })} />
          </FormField>
          <FormField label="Kategori" htmlFor="tx-cat" error={errors.kategori}>
            <select id="tx-cat" className={`comic-input ${errors.kategori ? 'is-invalid' : ''}`} value={form.kategori} onChange={(e) => set({ kategori: e.target.value })}>
              {options.length === 0 && <option value="">Tidak ada kategori aktif</option>}
              {options.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Nominal (Rp)" htmlFor="tx-amount" error={errors.nominal} hint={Number.isFinite(amount) && amount > 0 ? formatIDR(amount) : 'Contoh: 25000'}>
          <input
            id="tx-amount"
            ref={amountRef}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            className={`comic-input comic-input--mono ${errors.nominal ? 'is-invalid' : ''}`}
            value={form.nominalText}
            onChange={(e) => set({ nominalText: e.target.value.replace(/[^\d.\-]/g, '') })}
            onBlur={() => { if (Number.isFinite(amount) && amount > 0) set({ nominalText: formatThousands(amount) }); }}
          />
        </FormField>

        <FormField label="Catatan (opsional)" htmlFor="tx-note" error={errors.catatan}>
          <textarea id="tx-note" rows={2} maxLength={500} className={`comic-input resize-none ${errors.catatan ? 'is-invalid' : ''}`} value={form.catatan} onChange={(e) => set({ catatan: e.target.value })} placeholder="Mis. makan siang, kopi" />
        </FormField>
      </form>
    </Modal>
  );
}
