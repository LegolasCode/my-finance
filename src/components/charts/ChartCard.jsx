import Card from '../ui/Card.jsx';
import { EmptyState } from '../ui/States.jsx';

export default function ChartCard({ title, subtitle, tone = 'primary', isEmpty, emptyText = 'Belum ada data pada periode ini.', height = 'h-64', children }) {
  return (
    <Card title={title} subtitle={subtitle} tone={tone}>
      {isEmpty ? <EmptyState title={emptyText} /> : <div className={height}>{children}</div>}
    </Card>
  );
}
