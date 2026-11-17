import { useData, formatMoney } from '@/data/store';
import { PageHeader, StatCard } from '@/components/ui/Common';
import { Wallet, ShoppingCart, TrendingUp, Package } from 'lucide-react';

export function AdminAnalytics() {
  const data = useData();
  if (!data) return null;

  const activeOrders = data.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned');
  const revenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = activeOrders.length ? revenue / activeOrders.length : 0;

  // Revenue by category (from order lines)
  const byCategory: Record<string, number> = {};
  activeOrders.forEach((o) => o.lines.forEach((l) => {
    const p = data.products.find((x) => x.id === l.productId);
    if (p) byCategory[p.categoryId] = (byCategory[p.categoryId] || 0) + l.lineTotal;
  }));
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catEntries.map((e) => e[1]));

  // Orders by status
  const statusCount: Record<string, number> = {};
  data.orders.forEach((o) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

  // Monthly revenue (group by YYYY-MM)
  const byMonth: Record<string, number> = {};
  activeOrders.forEach((o) => { const m = o.createdAt.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + o.total; });
  const months = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
  const maxMonth = Math.max(1, ...months.map((m) => m[1]));

  return (
    <>
      <PageHeader title="التحليلات" subtitle="مؤشرات أداء المتجر والمبيعات" />
      <div className="grid-4">
        <StatCard label="إجمالي الإيرادات" value={formatMoney(revenue)} icon={<Wallet size={22} />} tone="plum" />
        <StatCard label="متوسط قيمة الطلب" value={formatMoney(avgOrder)} icon={<TrendingUp size={22} />} tone="gold" />
        <StatCard label="طلبات مكتملة" value={String(activeOrders.length)} icon={<ShoppingCart size={22} />} tone="blue" />
        <StatCard label="منتجات معروضة" value={String(data.products.filter((p) => p.isActive).length)} icon={<Package size={22} />} tone="green" />
      </div>

      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card card-pad">
          <h3 style={{ fontSize: 17, marginBottom: 20 }}>الإيرادات حسب الفئة</h3>
          {catEntries.length ? catEntries.map(([cid, val]) => {
            const cat = data.categories.find((c) => c.id === cid);
            return <div key={cid} style={{ marginBottom: 14 }}>
              <div className="row-between" style={{ fontSize: 13, marginBottom: 5 }}><span>{cat?.nameAr || cid}</span><strong>{formatMoney(val)}</strong></div>
              <div style={{ height: 9, background: 'var(--rose-100)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${(val / maxCat) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--plum-700), var(--plum-500))', borderRadius: 99 }} /></div>
            </div>;
          }) : <p className="muted center" style={{ padding: 30 }}>لا توجد بيانات كافية بعد.</p>}
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 17, marginBottom: 20 }}>الإيرادات الشهرية</h3>
          {months.length ? months.map(([m, val]) => (
            <div key={m} style={{ marginBottom: 14 }}>
              <div className="row-between" style={{ fontSize: 13, marginBottom: 5 }}><span>{m}</span><strong>{formatMoney(val)}</strong></div>
              <div style={{ height: 9, background: 'var(--rose-100)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${(val / maxMonth) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))', borderRadius: 99 }} /></div>
            </div>
          )) : <p className="muted center" style={{ padding: 30 }}>لا توجد بيانات كافية بعد.</p>}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 22 }}>
        <h3 style={{ fontSize: 17, marginBottom: 20 }}>توزيع الطلبات حسب الحالة</h3>
        <div className="row wrap" style={{ gap: 12 }}>
          {Object.entries(statusCount).map(([s, count]) => (
            <div key={s} style={{ background: 'var(--rose-50)', borderRadius: 14, padding: '14px 20px', minWidth: 130 }}>
              <div className="muted" style={{ fontSize: 12 }}>{s}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--plum-700)' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
