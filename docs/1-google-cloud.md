# 1. Menyiapkan Google Cloud (sekali oleh pengembang)

Aplikasi ini **tidak punya server**. Browser pengguna memanggil Google Sheets API dan Google Drive API langsung dengan izin milik pengguna itu sendiri. Anda hanya perlu satu *OAuth Client ID* (publik, bukan rahasia).

## A. Buat project dan aktifkan API
1. Buka <https://console.cloud.google.com> → **Buat project** (mis. `pengatur-keuangan`).
2. **APIs & Services → Library**, aktifkan keduanya:
   - **Google Sheets API**
   - **Google Drive API**

   > Jika salah satu belum aktif, aplikasi menampilkan: *"Google Sheets API / Google Drive API belum diaktifkan pada project Google Cloud aplikasi ini."*

## B. OAuth consent screen (Google Auth Platform)
1. Jenis pengguna: **External**. Isi nama aplikasi, email dukungan, dan email kontak pengembang.
2. **Scopes** — tambahkan hanya:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/drive.file` (*"See, edit, create, and delete only the specific Google Drive files you use with this app"*)

   `drive.file` termasuk scope **non-sensitive** dan hanya menjangkau file yang dibuat aplikasi ini, bukan seluruh Drive pengguna. Karena itu aplikasi tidak memerlukan verifikasi scope sensitif/restricted. (Konfirmasi dokumentasi Google terbaru: *developers.google.com/workspace/sheets/api/scopes*.)
3. **App domain / Privacy policy link:** isi dengan `https://DOMAIN-ANDA/privacy.html` (halaman sudah disediakan di `public/privacy.html`). Isi juga *Authorized domains* dengan domain hosting Anda.

## C. Agar bisa dipakai publik
Status **Testing** hanya mengizinkan *test user* yang Anda daftarkan. Untuk pengguna umum:
1. Pada consent screen klik **Publish app** → status **In production**.
2. Karena hanya scope non-sensitive, Google hanya meminta *verifikasi dasar* (nama, logo/branding, domain, privacy policy). Ikuti petunjuk di halaman consent screen. Selama belum selesai, pengguna mungkin melihat layar *"Google hasn't verified this app"* dan perlu klik **Advanced → Go to …**.

## D. Buat OAuth Client ID
1. **Credentials → Create credentials → OAuth client ID → Web application**.
2. **Authorized JavaScript origins** (hanya asal, tanpa path/garis miring akhir):
   - `http://localhost:5173`
   - `https://DOMAIN-ANDA` (setiap domain produksi, termasuk preview jika dipakai)

   *Authorized redirect URIs* dikosongkan (alur popup tidak memakainya).
3. Salin **Client ID** ke `.env` → `VITE_GOOGLE_CLIENT_ID`.

## E. Hal penting tentang privasi
Client ID yang terlihat di bundle aman. Akses data dijaga oleh token milik masing-masing pengguna. Anda sebagai pemilik project **tidak mendapatkan token pengguna maupun datanya**. Lihat [docs/6-privasi-dan-batasan.md](6-privasi-dan-batasan.md).
