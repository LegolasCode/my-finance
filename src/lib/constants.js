// Nilai `Tipe` disimpan di Google Sheets persis seperti di Excel (Bahasa Indonesia).
export const TX_TYPE = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  SAVINGS: 'Tabungan',
};

export const TX_TYPES = [TX_TYPE.INCOME, TX_TYPE.EXPENSE, TX_TYPE.SAVINGS];

// `tone` = nama warna di design system (lihat src/styles/theme.css), bukan kode warna.
export const TX_TYPE_META = {
  [TX_TYPE.INCOME]: { label: 'Pemasukan', tone: 'income', sign: '+' },
  [TX_TYPE.EXPENSE]: { label: 'Pengeluaran', tone: 'expense', sign: '-' },
  [TX_TYPE.SAVINGS]: { label: 'Tabungan', tone: 'secondary', sign: '' },
};

export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const BUDGET_STATUS = {
  aman: { key: 'aman', label: 'Aman', tone: 'income' },
  hampir: { key: 'hampir', label: 'Hampir Habis', tone: 'primary' },
  habis: { key: 'habis', label: 'Habis', tone: 'accent' },
  over: { key: 'over', label: 'Over Budget', tone: 'expense' },
};

export const DEFAULT_CATEGORIES = [
  ['Gaji', TX_TYPE.INCOME], ['Bonus', TX_TYPE.INCOME],
  ['Makan & Minum', TX_TYPE.EXPENSE], ['Transportasi', TX_TYPE.EXPENSE], ['Pulsa & Internet', TX_TYPE.EXPENSE],
  ['Hiburan & Nongkrong', TX_TYPE.EXPENSE], ['Belanja Kebutuhan', TX_TYPE.EXPENSE],
  ['Tabungan', TX_TYPE.SAVINGS],
];

export const LIMITS = {
  maxAmount: 1_000_000_000_000,
  maxNoteLength: 500,
  maxCategoryLength: 40,
  minYear: 2000,
  maxYear: 2100,
};
