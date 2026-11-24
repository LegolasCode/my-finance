# 3. Deploy frontend

Hasil build statis. Tidak ada server yang perlu dijalankan.

Pengaturan umum: **Build command** `npm run build` · **Output directory** `dist` · **Environment variable** `VITE_GOOGLE_CLIENT_ID`.
Aplikasi memakai `HashRouter`, jadi bisa dihosting di mana pun tanpa aturan rewrite.

## Vercel / Netlify / Cloudflare Pages
Impor repositori, isi variabel di atas, deploy.

## GitHub Pages
1. Tambahkan `base: '/nama-repo/'` di `vite.config.js`.
2. `npm run build`, lalu publikasikan isi `dist/`.

## Setelah deploy
1. Tambahkan alamat produksi ke **Authorized JavaScript origins** ([panduan 1](1-google-cloud.md), langkah D).
2. Pastikan `https://DOMAIN-ANDA/privacy.html` bisa dibuka dan sudah tercantum di consent screen.
3. Jangan mengaktifkan header `Cross-Origin-Opener-Policy: same-origin` pada hosting: itu memutus popup login Google (nilai `same-origin-allow-popups` aman).
4. Jalankan [checklist uji](5-checklist-uji.md) pada alamat produksi, dengan **dua akun Google berbeda**.
