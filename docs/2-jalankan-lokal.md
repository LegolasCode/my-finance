# 2. Menjalankan secara lokal

Prasyarat: Node.js 18+ dan [panduan 1](1-google-cloud.md) selesai (minimal Client ID dengan origin `http://localhost:5173`).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Isi `.env`:

```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

```bash
npm run dev               # http://localhost:5173
```

Klik **Masuk dengan Google**. Saat pertama kali, aplikasi membuat spreadsheet **"Pengatur Keuangan"** di Google Drive akun yang masuk. Buka dari **Pengaturan → Buka di Google Sheets**, lalu jalankan **Pengaturan → Uji baca/tulis**.

> Variabel `.env` dibaca saat server dimulai. Restart `npm run dev` setelah mengubahnya. Izinkan popup untuk `localhost`, karena login Google berjalan dalam popup.

Tes otomatis (tanpa instalasi tambahan): `npm test`.

## Memindahkan data dari versi lama (Apps Script) atau Excel
Struktur sheet identik (kolom `ID, Tanggal, Kategori, Tipe, Nominal, Catatan`). Salin baris data dari sheet lama ke tab **Transaksi** di spreadsheet baru (mulai baris 2); budget cukup kolom A–C ke tab **Budget** (rumus kolom D–F dibuat otomatis hanya untuk baris yang dibuat lewat aplikasi, isi manual bila perlu). Pastikan kolom ID terisi `txn_…` yang unik.
