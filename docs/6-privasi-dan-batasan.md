# 6. Privasi, model keamanan, dan batasan

## Siapa yang bisa mengakses apa
| Pihak | Dapat melihat data keuangan pengguna? |
|---|---|
| Pengguna | Ya, spreadsheet ada di Google Drive miliknya. |
| Pengembang / pemilik project Google Cloud | **Tidak.** Tidak ada server, database, atau log. Scope `drive.file` hanya berlaku untuk token milik pengguna yang login; pemilik project tidak menerimanya. |
| Hosting statis (Vercel/Netlify, dll.) | Tidak. Hanya menyajikan file HTML/JS/CSS. |
| Google | Ya, sebagaimana data apa pun di Google Drive (sesuai kebijakan Google). |

## Cara kerjanya
- Login memakai OAuth token client di browser. Access token disimpan di memori + `sessionStorage` (hilang saat tab ditutup) dan hanya dikirim ke `*.googleapis.com`.
- Scope `drive.file`: aplikasi hanya melihat file yang **ia buat sendiri** (spreadsheet "Pengatur Keuangan"), bukan file Drive lain.
- Spreadsheet dicari lewat penanda (`appProperties`) pada file, jadi pengguna memperoleh spreadsheet yang sama di semua perangkat.
- Semua penulisan memakai `valueInputOption=RAW`, sehingga teks seperti `=HYPERLINK(...)` tersimpan sebagai teks (anti formula-injection).

## Batasan yang perlu diketahui
1. **Kepercayaan pada kode web.** Siapa pun yang mengendalikan domain hosting dapat mengganti kode JavaScript. Kode yang berniat jahat bisa memakai token pengguna saat pengguna login. Mitigasi: kode sumber terbuka dan dapat diaudit, hindari skrip pihak ketiga, jaga akun hosting dengan 2FA, dan pakai domain yang stabil.
2. **Sesi ±1 jam.** Token Google berumur sekitar satu jam. Aplikasi memperbaruinya otomatis; bila gagal (mis. popup diblokir) muncul banner **Sambungkan kembali**.
3. **Spreadsheet dihapus/dibuang ke sampah** oleh pengguna: aplikasi membuat spreadsheet baru kosong saat login berikutnya (data lama ada di sampah Drive selama 30 hari).
4. **Mencabut akses** di pengaturan akun Google dapat membuat aplikasi tidak lagi "mengenali" spreadsheet lama (karena `drive.file` hanya melihat file yang dikaitkan dengan izin aktif). Spreadsheet tetap utuh di Drive. Salin datanya ke spreadsheet baru bila perlu.
5. **Dua perangkat menulis bersamaan.** Penulisan diserialkan per tab, tetapi tidak ada penguncian lintas perangkat; edit bersamaan pada baris yang sama bisa saling menimpa (last-write-wins).
6. **Locale spreadsheet** dikunci ke `en_US` saat dibuat agar rumus (kolom D–F Budget, tab Dashboard) terbaca di semua negara. Efeknya hanya pada tampilan angka di Google Sheets (mis. `Rp1,699,000`), bukan pada aplikasi.
7. **Kuota Google API.** Setiap pengguna memakai kuota per-pengguna; kuota per-project dibagi seluruh pengguna. Untuk pemakaian pribadi sangat longgar, pantau di Google Cloud Console bila pengguna banyak.
8. Menyimpan data di perangkat bersama: gunakan **Keluar** setelah selesai.
