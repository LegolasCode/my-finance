import { Loader2 } from 'lucide-react';

// `secondary` = tombol netral (putih). Warna lain mengikuti palet di design system.
const VARIANTS = {
  primary: 'comic-btn--primary',
  secondary: '',
  sky: 'comic-btn--secondary',
  danger: 'comic-btn--danger',
  income: 'comic-btn--income',
  accent: 'comic-btn--accent',
  ghost: 'comic-btn--ghost',
};

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, block = false, children, className = '', disabled, ...rest }) {
  const cls = ['comic-btn', VARIANTS[variant], size === 'sm' && 'comic-btn--sm', size === 'lg' && 'comic-btn--lg', block && 'comic-btn--block', className].filter(Boolean).join(' ');
  return (
    <button type="button" disabled={disabled || loading} className={cls} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
