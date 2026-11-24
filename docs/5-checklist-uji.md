# 5. Checklist uji (wajib sebelum dipakai umum)

Integrasi dengan Google baru terbukti setelah langkah-langkah ini berhasil pada akun Google nyata.

## Akun baru
- [ ] Klik **Masuk dengan Google** → layar izin hanya meminta profil dan akses *file yang digunakan dengan aplikasi ini*.
- [ ] Layar "Menyiapkan ruang kerja" berjalan: mencari → membuat spreadsheet → menyiapkan tab.
- [ ] Di Google Drive akun itu muncul spreadsheet **Pengatur Keuangan** dengan tab **Transaksi, Budget, Dashboard, Kategori**; tab Kategori berisi 8 kategori.
- [ ] Keluar lalu masuk lagi → tidak membuat spreadsheet kedua; data yang sama muncul.
- [ ] Masuk dari perangkat/browser lain dengan akun yang sama → data yang sama.

## Isolasi antar-pengguna (inti privasi)
- [ ] Masuk dengan **akun B** → dashboard kosong (tidak ada data akun A) dan di Drive B muncul spreadsheet sendiri.
- [ ] Dari akun B, buka URL spreadsheet milik A → Google menolak akses.
- [ ] Pemilik project Google Cloud (Anda) tidak melihat spreadsheet pengguna lain di Drive-nya.

## Fitur (ulangi di tiap akun)
- [ ] **Pengaturan → Uji koneksi** dan **Uji baca/tulis**: semua langkah hijau, tidak ada baris sisa.
- [ ] Tambah, ubah, hapus transaksi (dengan konfirmasi) → langsung tampak di tab **Transaksi** Google Sheets.
- [ ] Edit langsung di Google Sheets lalu **Muat ulang data** → perubahan terbaca.
- [ ] Nominal `-5000`, `0`, kosong, atau huruf ditolak; catatan `=1+1` tersimpan sebagai teks.
- [ ] Putuskan internet, simpan transaksi → pesan galat; sambungkan lagi dan simpan ulang → hanya satu baris.
- [ ] Atur budget kategori Pengeluaran; tambah pengeluaran → aktual, sisa, persen, status berubah. Uji ambang: budget 100.000, aktual 79.999 *Aman*, 80.000 *Hampir Habis*, 100.000 *Habis*, 100.001 *Over Budget*.
- [ ] Tabungan tidak muncul di budget dan tidak dihitung sebagai pengeluaran.
- [ ] Dashboard mengikuti bulan/tahun; bulan kosong tampil keadaan kosong, bukan error.

## Sesi
- [ ] Biarkan terbuka lebih dari 1 jam lalu simpan transaksi → token diperbarui otomatis, atau banner **Sambungkan kembali** muncul dan setelah diklik semuanya normal.
- [ ] **Keluar** → kembali ke halaman login; tab baru tidak membuka data tanpa login.

## Tampilan
- [ ] Desktop: sidebar kiri. HP: navigasi bawah, tabel menjadi kartu.
- [ ] Tombol terasa "ditekan" (bergeser ke kanan-bawah, bayangan hilang).
- [ ] Mengubah `--c-primary` di `theme.css` mengubah warna aksen di seluruh aplikasi.
