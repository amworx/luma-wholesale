import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Inbox size={30} /></div>
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>{title}</h3>
      {description && <p style={{ maxWidth: 360, margin: '0 auto 16px' }}>{description}</p>}
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, tone = 'plum' }: {
  label: string; value: string; sub?: string; icon: ReactNode; tone?: 'plum' | 'gold' | 'green' | 'blue';
}) {
  const tones = {
    plum: { bg: 'var(--rose-100)', color: 'var(--plum-700)' },
    gold: { bg: '#fbf2dc', color: '#a6791f' },
    green: { bg: 'var(--success-bg)', color: 'var(--success)' },
    blue: { bg: 'var(--info-bg)', color: 'var(--info)' },
  };
  const t = tones[tone];
  return (
    <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: t.bg, color: t.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.3 }}>{value}</div>
        {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="row-between wrap" style={{ marginBottom: 22 }}>
      <div>
        <h2 style={{ fontSize: 24 }}>{title}</h2>
        {subtitle && <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div className="row wrap">{actions}</div>
    </div>
  );
}

export function ConfirmButton({ onConfirm, children, className = 'btn btn-danger btn-sm', title = 'تأكيد الحذف' }: {
  onConfirm: () => void; children: ReactNode; className?: string; title?: string;
}) {
  return <button className={className} title={title} onClick={() => { if (window.confirm('هل أنت متأكد؟')) onConfirm(); }}>{children}</button>;
}
