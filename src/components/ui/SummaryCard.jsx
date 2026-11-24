export default function SummaryCard({ title, value, caption, icon: Icon, tone = 'surface', hero = false }) {
  return (
    <div className={`stat-card tone-${tone} ${hero ? 'stat-card--hero' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="stat-card__label">{title}</p>
        <span className="stat-card__icon"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="stat-card__value">{value}</p>
      {caption && <p className="stat-card__caption">{caption}</p>}
    </div>
  );
}
