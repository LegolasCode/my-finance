import { NavLink, Outlet } from 'react-router-dom';
import { ArrowLeftRight, ExternalLink, LayoutDashboard, LogOut, PiggyBank, RefreshCw, Settings, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFinance } from '../../context/FinanceContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import Button from '../ui/Button.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { to: '/budget', label: 'Budget', icon: PiggyBank },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];
const linkClass = ({ isActive }) => (isActive ? 'is-active' : '');

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/my-finance-logo.webp"
        alt="Logo My Finance"
        className="w-11 h-11 rounded-full object-cover border-2 border-[#18181B]"
      />
      <div>
        <p className="comic-display text-xl uppercase leading-none">My Finance</p>
        <p className="text-[11px] font-bold uppercase tracking-wider comic-muted">
          Personal Finance Tracker
        </p>
      </div>
    </div>
  );
}

function ReauthBanner() {
  const { needsReauth, reconnect } = useAuth();
  const { reload } = useFinance();
  const toast = useToast();
  if (!needsReauth) return null;
  const go = async () => {
    try { await reconnect(); toast.success('Tersambung kembali.'); reload(); } catch { toast.error('Gagal menyambung. Izinkan popup lalu coba lagi.'); }
  };
  return (
    <div className="tone-expense flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink px-4 py-2.5" role="alert">
      <p className="flex items-center gap-2 text-sm font-bold"><WifiOff className="h-4 w-4" /> Sesi Google berakhir. Data tidak bisa disimpan sampai tersambung kembali.</p>
      <Button size="sm" variant="primary" onClick={go}>Sambungkan kembali</Button>
    </div>
  );
}

export default function AppLayout() {
  const { user, workspace, signOut } = useAuth();
  const { status, reload } = useFinance();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sidebar hidden w-72 shrink-0 flex-col p-4 lg:flex">
        <div className="px-1 py-3"><Brand /></div>
        <nav className="mt-5 flex flex-1 flex-col gap-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={(s) => `nav-link ${linkClass(s)}`}><Icon className="h-5 w-5" /> {label}</NavLink>
          ))}
        </nav>
        <div className="comic-card comic-card--flat p-3">
          <div className="flex items-center gap-2.5">
            {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full border-2 border-ink" /> : <div className="tone-accent h-9 w-9 rounded-full border-2 border-ink" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-[11px] comic-muted">{user.email}</p>
            </div>
          </div>
          {workspace?.spreadsheetUrl && (
            <a href={workspace.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="comic-btn comic-btn--sm comic-btn--income comic-btn--block mt-3"><ExternalLink className="h-3.5 w-3.5" /> Buka Google Sheets</a>
          )}
          <Button size="sm" variant="secondary" block className="mt-2" icon={LogOut} onClick={signOut}>Keluar</Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <button onClick={reload} disabled={status === 'loading'} className="comic-btn comic-btn--sm !p-2" aria-label="Muat ulang data"><RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} /></button>
            <button onClick={signOut} className="comic-btn comic-btn--sm !p-2" aria-label="Keluar"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <ReauthBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8"><Outlet /></main>
        <nav className="bottom-nav lg:hidden" aria-label="Navigasi utama">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}><Icon className="h-5 w-5" /> {label}</NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
