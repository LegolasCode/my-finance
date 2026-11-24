import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const ORDER = ['auth', 'profile', 'find', 'create', 'setup'];
const STEPS = [
  { id: 'auth', label: 'Menghubungkan akun Google', at: 'auth' },
  { id: 'find', label: 'Mencari spreadsheet di Google Drive Anda', at: 'find' },
  { id: 'create', label: 'Membuat spreadsheet baru untuk Anda', at: 'create', onlyIfReached: true },
  { id: 'setup', label: 'Menyiapkan tab dan kategori', at: 'setup' },
];

export default function Provisioning() {
  const { step } = useAuth();
  const current = ORDER.indexOf(step);
  const visible = STEPS.filter((s) => !s.onlyIfReached || current >= ORDER.indexOf(s.at));
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="comic-card w-full max-w-md overflow-hidden" role="status" aria-live="polite">
        <header className="comic-card__header tone-secondary"><h1 className="comic-card__title">Menyiapkan ruang kerja Anda…</h1></header>
        <ul className="space-y-3 p-6">
          {visible.map((s) => {
            const idx = ORDER.indexOf(s.at);
            const done = current > idx && !(s.id === 'auth' && step === 'profile');
            const active = !done && (current === idx || (s.id === 'auth' && step === 'profile'));
            return (
              <li key={s.id} className="flex items-center gap-3 font-bold">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink ${done ? 'tone-income' : active ? 'tone-primary' : 'tone-surface'}`}>
                  {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                </span>
                <span className={done || active ? '' : 'comic-muted'}>{s.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="border-t-[3px] border-ink px-6 py-3 text-xs font-medium comic-muted">Pertama kali masuk? Spreadsheet dibuat otomatis di Google Drive Anda. Ini hanya sekali.</p>
      </div>
    </div>
  );
}
