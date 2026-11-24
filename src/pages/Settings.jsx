import { useState } from 'react';
import { CheckCircle2, ExternalLink, Plug, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../api/index.js';
import { config } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFinance } from '../context/FinanceContext.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import CategoryManager from '../components/budget/CategoryManager.jsx';

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-bold uppercase tracking-wider comic-muted">{label}</dt>
      <dd className="text-sm font-bold">{children}</dd>
    </div>
  );
}

const Ok = ({ children }) => <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 shrink-0" />{children}</span>;
const Bad = ({ children }) => <span className="comic-error !mt-0 inline-flex items-center gap-1.5"><XCircle className="h-4 w-4 shrink-0" />{children}</span>;

export default function Settings() {
  const { user, workspace } = useAuth();
  const { status, error, lastSync, transactions, budgets, categories, reload } = useFinance();
  const [pingState, setPingState] = useState({ loading: false, result: null, error: '' });
  const [testState, setTestState] = useState({ loading: false, result: null, error: '' });

  const runPing = async () => {
    setPingState({ loading: true, result: null, error: '' });
    try { setPingState({ loading: false, result: await api.ping(), error: '' }); } catch (e) { setPingState({ loading: false, result: null, error: e.message }); }
  };
  const runSelfTest = async () => {
    setTestState({ loading: true, result: null, error: '' });
    try { setTestState({ loading: false, result: await api.selfTest(), error: '' }); } catch (e) { setTestState({ loading: false, result: null, error: e.message }); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="comic-title text-4xl sm:text-5xl">Pengaturan</h1>
        <p className="mt-2 text-sm font-medium">Kelola kategori, cek koneksi Google Sheets, dan informasi aplikasi.</p>
      </div>

      <Card title="Kelola Kategori" subtitle="Dipakai pada form transaksi dan budget (hanya kategori Pengeluaran yang masuk budget)." tone="accent">
        <CategoryManager />
      </Card>

      <Card title="Spreadsheet Anda" subtitle="Dibuat dan disimpan di Google Drive milik Anda sendiri" tone="income">
        <dl className="comic-divide">
          <Row label="Akun Google">{user.email}</Row>
          <Row label="Status data">
            {status === 'ready' ? <Ok>Terhubung</Ok> : status === 'loading' ? 'Memuat…' : status === 'error' ? <Bad>{error?.message || 'Gagal'}</Bad> : '-'}
          </Row>
          <Row label="Sinkronisasi terakhir"><span className="comic-num">{lastSync ? lastSync.toLocaleString('id-ID') : '-'}</span></Row>
          <Row label="Data termuat"><span className="comic-num">{transactions.length} transaksi · {budgets.length} budget · {categories.length} kategori</span></Row>
        </dl>

        <div className="mt-4 flex flex-wrap gap-3">
          {workspace?.spreadsheetUrl && (
            <a href={workspace.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="comic-btn comic-btn--income"><ExternalLink className="h-4 w-4" /> Buka di Google Sheets</a>
          )}
          <Button variant="sky" icon={Plug} loading={pingState.loading} onClick={runPing}>Uji koneksi</Button>
          <Button variant="secondary" loading={testState.loading} onClick={runSelfTest}>Uji baca/tulis</Button>
          <Button variant="secondary" onClick={reload} loading={status === 'loading'}>Muat ulang data</Button>
        </div>

        {pingState.result && (
          <p className="mt-4 text-sm font-bold"><Ok>Terhubung ke &ldquo;{pingState.result.title}&rdquo; · {pingState.result.tabs.length} tab · <span className="comic-num">{pingState.result.latencyMs} ms</span></Ok></p>
        )}
        {pingState.error && <p className="mt-4"><Bad>{pingState.error}</Bad></p>}

        {testState.result && (
          <div className="comic-card comic-card--flat mt-4 p-4">
            <p className="mb-2 text-sm font-bold">{testState.result.passed ? <Ok>Semua uji lulus</Ok> : <Bad>Ada uji yang gagal</Bad>}</p>
            <ul className="space-y-1.5 text-sm font-medium">
              {testState.result.steps.map((s) => (
                <li key={s.name}>{s.ok ? <Ok>{s.name}</Ok> : <Bad>{s.name}{s.detail ? ` (${s.detail})` : ''}</Bad>}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs comic-muted">Uji ini menulis satu baris sementara ke tab Transaksi di spreadsheet Anda lalu menghapusnya kembali.</p>
          </div>
        )}
        {testState.error && <p className="mt-4"><Bad>{testState.error}</Bad></p>}
      </Card>

      <Card title="Privasi" subtitle="Data keuangan Anda hanya milik Anda" tone="secondary">
        <ul className="space-y-3 text-sm font-medium">
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /> Aplikasi ini tidak punya server atau database. Browser Anda berbicara langsung dengan Google.</li>
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /> Izin yang diminta hanya &ldquo;file yang dibuat aplikasi ini&rdquo;, bukan seluruh isi Google Drive Anda.</li>
          <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /> Anda dapat mencabut akses kapan saja di <a className="comic-link" href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">pengaturan akun Google</a>. Spreadsheet Anda tetap ada di Drive.</li>
        </ul>
      </Card>

      <Card title="Informasi Aplikasi" tone="primary">
        <dl className="comic-divide">
          <Row label="Nama">Pengatur Keuangan — Personal Finance Tracker</Row>
          <Row label="Versi">{config.appVersion}</Row>
          <Row label="Frontend">React · Vite · Tailwind CSS · Recharts</Row>
          <Row label="Penyimpanan">Google Sheets pribadi pengguna (Google Drive)</Row>
          <Row label="Mata uang">Rupiah (IDR)</Row>
        </dl>
      </Card>
    </div>
  );
}
