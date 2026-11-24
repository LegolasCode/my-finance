import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';

export default function Modal({ title, onClose, children, footer, disableClose = false, tone = 'primary' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !disableClose) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, disableClose]);

  return (
    <div className="comic-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !disableClose) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="comic-modal">
        <header className={`comic-card__header tone-${tone} items-center`}>
          <h2 className="comic-card__title">{title}</h2>
          <button onClick={onClose} disabled={disableClose} className="comic-btn comic-btn--sm !p-1" aria-label="Tutup"><X className="h-4 w-4" /></button>
        </header>
        <div className="comic-modal__body">{children}</div>
        {footer && <footer className="comic-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Hapus', loading, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      tone="expense"
      onClose={onCancel}
      disableClose={loading}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="text-sm font-medium">{message}</p>
    </Modal>
  );
}
