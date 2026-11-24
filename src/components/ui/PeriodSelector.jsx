import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS } from '../../lib/constants.js';

export default function PeriodSelector({ period, onChange, years }) {
  const step = (delta) => {
    let m = period.month + delta;
    let y = period.year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    onChange({ year: y, month: m });
  };
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => step(-1)} className="comic-btn comic-btn--sm !p-2" aria-label="Bulan sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
      <select aria-label="Bulan" className="comic-input comic-input--auto font-bold" value={period.month} onChange={(e) => onChange({ ...period, month: Number(e.target.value) })}>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select aria-label="Tahun" className="comic-input comic-input--auto comic-num" value={period.year} onChange={(e) => onChange({ ...period, year: Number(e.target.value) })}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={() => step(1)} className="comic-btn comic-btn--sm !p-2" aria-label="Bulan berikutnya"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}
