export default function ProgressBar({ percent, tone = 'income' }) {
  const width = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 100));
  return (
    <div className="comic-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(width)}>
      <div className={`comic-progress__bar tone-${tone} ${width === 0 ? 'is-empty' : ''}`} style={{ width: `${width}%` }} />
    </div>
  );
}
