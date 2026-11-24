export default function Card({ title, subtitle, action, children, className = '', padded = true, tone = 'primary', flat = false }) {
  return (
    <section className={`comic-card ${flat ? 'comic-card--flat' : ''} ${className}`}>
      {(title || action) && (
        <header className={`comic-card__header tone-${tone}`}>
          <div>
            {title && <h2 className="comic-card__title">{title}</h2>}
            {subtitle && <p className="comic-card__subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}
