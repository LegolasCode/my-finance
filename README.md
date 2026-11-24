# Pengatur Keuangan — Personal Finance Tracker

Aplikasi web pencatat keuangan berdesain **comic / pop-art**. Pengganti `Pengatur Keuangan.xlsx`: transaksi, budget bulanan, dan dashboard. Dapat dipakai **publik**: setiap pengguna masuk dengan Google dan data tersimpan di **spreadsheet miliknya sendiri**.

**Stack:** React + Vite · Tailwind CSS · Recharts · Lucide · Google Sheets API & Drive API (langsung dari browser, tanpa backend).

## Alur pengguna
1. Pengguna klik **Masuk dengan Google** (akun Google baru otomatis dipakai).
2. Pertama kali: aplikasi membuat spreadsheet **"Pengatur Keuangan"** di Google Drive pengguna, lengkap dengan tab Transaksi, Budget, Dashboard, Kategori.
3. Pengguna memakai aplikasi; setiap perubahan tersimpan di spreadsheet itu.
4. Masuk lagi dari perangkat mana pun → data muncul sesuai akun Google.

## Mengapa data tidak bisa diakses pengembang
```
Browser pengguna ──token milik pengguna──▶ Google Sheets / Drive API
        (tidak ada server, database, atau log milik pengembang)
```
Scope `drive.file` hanya memberi akses ke file yang dibuat aplikasi ini di Drive pengguna itu sendiri. Detail dan batasannya: [docs/6-privasi-dan-batasan.md](docs/6-privasi-dan-batasan.md).

## Mulai
1. [docs/1-google-cloud.md](docs/1-google-cloud.md): buat Client ID (sekali, ±10 menit)
2. [docs/2-jalankan-lokal.md](docs/2-jalankan-lokal.md)
3. [docs/3-deploy-frontend.md](docs/3-deploy-frontend.md)
4. [docs/4-tema-design-system.md](docs/4-tema-design-system.md): ubah warna/font dari satu file
5. [docs/5-checklist-uji.md](docs/5-checklist-uji.md): **jalankan sebelum dirilis**

```bash
npm install
cp .env.example .env     # isi VITE_GOOGLE_CLIENT_ID
npm run dev              # http://localhost:5173
npm run build            # hasil di dist/
npm test                 # tes logika keuangan + lapisan data (Google tiruan)
```

## Struktur
```
src/
  styles/      theme.css (SEMUA token tema) · components.css (kelas komponen)
  api/         google.js (HTTP+token+retry) · workspace.js (buat sheet pengguna)
               sheets.js (CRUD Sheets API) · index.js
  lib/         calculations.js · validators.js · format.js · dates.js · constants.js
  context/     AuthContext.jsx (login Google) · FinanceContext.jsx
  components/  layout/ · ui/ · charts/ · transactions/ · budget/
  pages/       Login · Provisioning · Dashboard · Transactions · Budget · Settings
public/        privacy.html (kebijakan privasi untuk consent screen)
tests/         fake-google.mjs (Google Sheets/Drive tiruan) · sheets.test.mjs
docs/          panduan
```

## Aturan perhitungan
| Metrik | Rumus |
|---|---|
| Saldo Akhir | Pemasukan − Pengeluaran − Tabungan |
| Saving Rate | Tabungan ÷ Pemasukan × 100% (0% bila pemasukan 0) |
| Sisa Budget | Total Budget − pengeluaran aktual pada kategori yang punya budget |
| Status | <80% Aman · 80% s/d <100% Hampir Habis · =100% Habis · >100% Over Budget |

Tabungan bukan Pengeluaran dan tidak masuk budget (menghindari *double counting*).
