import { FileSpreadsheet, Lock, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="comic-card w-full max-w-md overflow-hidden">
        <header className="comic-card__header tone-primary"><h1 className="comic-card__title">Konfigurasi belum lengkap</h1></header>
        <div className="space-y-3 p-5 text-sm font-medium">
          <p>Buat file <span className="comic-code">.env</span> (salin dari <span className="comic-code">.env.example</span>) lalu isi:</p>
          <p><span className="comic-code">VITE_GOOGLE_CLIENT_ID</span></p>
          <p>Kemudian jalankan ulang <span className="comic-code">npm run dev</span>. Panduan lengkap ada di folder <span className="comic-code">docs/</span>.</p>
        </div>
      </div>
    </div>
  );
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 6.9l7.3 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.8 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const POINTS = [
  { icon: FileSpreadsheet, text: 'Spreadsheet dibuat otomatis di Google Drive Anda sendiri.' },
  { icon: Lock, text: 'Data hanya mengalir antara browser Anda dan Google. Tanpa server perantara.' },
  { icon: UserX, text: 'Pengembang dan pemilik aplikasi tidak bisa membaca data Anda.' },
];

export default function Login() {
  const { gsiReady, authError, signIn } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative mx-auto mb-6 grid h-36 w-36 place-items-center">
          <div className="burst tone-ink absolute inset-0" />
          <div className="burst tone-primary absolute inset-[5px]" />
          <span className="comic-display relative -rotate-6 text-4xl uppercase">Hai!</span>
        </div>

        <div className="comic-card overflow-hidden">
          <header className="comic-card__header tone-primary justify-center text-center">
            <h1 className="comic-title text-3xl sm:text-4xl">My Finance</h1>
          </header>
          <div className="space-y-5 p-6">
            <p className="text-center text-sm font-medium">Catat pemasukan, pengeluaran, dan tabungan. Masuk dengan Google untuk membuka atau membuat spreadsheet pribadi Anda.</p>

            <button type="button" onClick={signIn} disabled={!gsiReady} className="comic-btn comic-btn--primary comic-btn--lg comic-btn--block">
              <GoogleG /> {gsiReady ? 'Masuk dengan Google' : 'Memuat Google…'}
            </button>

            {authError && <p className="comic-error !mt-0 block" role="alert">{authError}</p>}

            <ul className="space-y-3 border-t-[3px] border-ink pt-4">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm font-medium">
                  <span className="stat-card__icon tone-secondary shrink-0"><Icon className="h-4 w-4" /></span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
            <p className="text-center text-xs comic-muted">Belum punya akun? Akun Google baru otomatis disiapkan saat pertama masuk. <a className="comic-link" href="./privacy.html" target="_blank" rel="noopener noreferrer">Kebijakan privasi</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
