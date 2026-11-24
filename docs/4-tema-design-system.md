# 4. Mengubah tema (Design System Comic / Pop-Art)

Semua pengaturan visual ada di **`src/styles/theme.css`**. Cukup ubah nilai di sana, tidak perlu menyentuh komponen.

## Warna (bagian 1)
| Variabel | Default | Dipakai untuk |
|---|---|---|
| `--c-paper` | `#FFFDF5` | Latar halaman (kertas komik) |
| `--c-surface` | `#FFFFFF` | Kartu, input, modal |
| `--c-ink` | `#18181B` | Border, bayangan, teks |
| `--c-primary` | `#FFD600` | Aksen utama, tombol utama, menu aktif |
| `--c-secondary` | `#38BDF8` | Aksen sekunder, tabungan |
| `--c-income` | `#4ADE80` | Pemasukan, status Aman |
| `--c-expense` | `#FF5E5B` | Pengeluaran, Over Budget, peringatan |
| `--c-accent` | `#C084FC` | Kategori tambahan, Saving Rate, status Habis |

Warna turunan (teks sekunder, garis tipis, titik halftone, warna grafik ke-6 sampai ke-8) dihitung otomatis dari warna di atas lewat `color-mix`, jadi ikut berubah.

## Bentuk & tekstur
- `--border-w`, `--border-w-thin`: ketebalan garis.
- `--shadow-offset`, `--shadow-offset-lg`: jarak bayangan keras. **Efek tekan tombol (`:active`) bergeser sejauh `--shadow-offset`** dan menghilangkan bayangan, jadi mengubah variabel ini otomatis menyesuaikan geraknya.
- `--halftone-size`, `--halftone-dot`, `--halftone-card-size`: kerapatan titik halftone di latar halaman dan header kartu.
- `--radius-sm/md/lg`: kelengkungan sudut.

## Font
`--font-display` (judul & angka besar, Bangers), `--font-body` (Space Grotesk), `--font-mono` (Space Mono, nominal transaksi). Jika mengganti font, ubah juga tautan Google Fonts di `index.html`.

## Kelas komponen (di `src/styles/components.css`)
`comic-card`, `comic-btn` (+ `--primary/--secondary/--danger/--income/--accent/--ghost/--sm/--lg`), `comic-input`, `comic-badge`, `comic-progress`, `comic-table`, `stat-card`, `halftone`, `speech-bubble`, `burst`, dan kelas warna latar `tone-primary|secondary|income|expense|accent|surface|paper|ink`.

Tailwind juga membaca token yang sama, misalnya `bg-primary`, `text-ink`, `font-display`, `shadow-comic`.
