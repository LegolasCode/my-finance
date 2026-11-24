import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from './Button.jsx';

export function Spinner({ label = 'Memuat data…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <div className="comic-card comic-card--flat tone-primary grid h-16 w-16 place-items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      <p className="comic-display text-xl uppercase tracking-wide">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="px-4 pb-12 pt-8 text-center">
      <div className="speech-bubble mx-auto mb-9 inline-block max-w-sm px-5 py-4 text-left">
        <p className="comic-display text-xl uppercase leading-tight">{title}</p>
        {description && <p className="mt-1 text-sm font-medium">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="comic-card mx-auto flex max-w-md flex-col items-center gap-3 p-6 text-center">
      <div className="comic-card tone-expense comic-card--flat grid h-14 w-14 place-items-center"><AlertTriangle className="h-7 w-7" /></div>
      <p className="comic-display text-2xl uppercase">Waduh, gagal memuat!</p>
      <p className="text-sm font-medium">{error?.message || 'Terjadi kesalahan tidak dikenal.'}</p>
      {onRetry && <Button variant="primary" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}
