export default function StatusBadge({ status }) {
  return <span className={`comic-badge tone-${status.tone}`}>{status.label}</span>;
}

export function TypeBadge({ meta }) {
  return <span className={`comic-badge tone-${meta.tone}`}>{meta.label}</span>;
}
