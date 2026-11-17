import { Link } from 'react-router-dom';
import { ShoppingCart, Users, Package, Wallet, ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { useData, formatMoney } from '@/data/store';
import { StatCard } from '@/components/ui/Common';

export function AdminOverview() {
  const data = useData();
  if (!data) return null;
  const revenue = data.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned').reduce((s, o) => s + o.total, 0);
  const newOrders = data.orders.filter((o) => o.status === 'new').length;
  const lowStock = data.products.filter((p) => p.variants.some((v) => v.stock <= v.lowStockThreshold)).length;
  const customers = data.users.filter((u) => u.role === 'customer').length;

  const topProducts = [...data.products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5);

  return (
    <div>
      <div className="row-between wrap" style={{ marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 24 }}>نظرة عامة</h2><p className="muted" style={{ fontSize: 13 }}>مرحباً بك، إليك ملخص أداء المتجر</p></div>
        <Link to="/store" className="btn btn-outline">عرض المتجر <ArrowLeft size={16} /></Link>
      </div>

      <div className="grid-4">
        <StatCard label="إجمالي المبيعات" value={formatMoney(revenue)} icon={<Wallet size={22} />} tone="plum" />
        <StatCard label="إجمالي الطلبات" value={String(data.orders.length)} sub={`${newOrders} جديدة`} icon={<ShoppingCart size={22} />} tone="blue" />
        <StatCard label="العملاء" value={String(customers)} icon={<Users size={22} />} tone="green" />
        <StatCard label="المنتجات" value={String(data.products.length)} sub={`${lowStock} منخفضة المخزون`} icon={<Package size={22} />} tone="gold" />
      </div>

      <div className="grid-2" style={{ marginTop: 22, gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="card card-pad">
          <div className="row-between" style={{ marginBottom: 20 }}><h3 style={{ fontSize: 17 }}>أحدث الطلبات</h3><Link to="/admin/orders" className="btn btn-ghost btn-sm">كل الطلبات <ArrowLeft size={14} /></Link></div>
          {[...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((o) => (
            <div key={o.id} className="row-between" style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--rose-100)', color: 'var(--plum-700)', display: 'grid', placeItems: 'center' }}><ShoppingCart size={17} /></div><div><div style={{ fontWeight: 700, fontSize: 13 }}>{o.orderNumber} — {o.customerName}</div><div className="muted" style={{ fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString('ar-SA')}</div></div></div>
              <strong style={{ color: 'var(--plum-700)' }}>{formatMoney(o.total)}</strong>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <h3 className="row" style={{ fontSize: 17, marginBottom: 20 }}><TrendingUp size={18} color="var(--plum-600)" /> الأكثر مبيعاً</h3>
          {topProducts.map((p, i) => (
            <div key={p.id} className="row-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ gap: 10 }}><span className="muted" style={{ width: 18 }}>{i + 1}</span><img src={p.images[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /><span style={{ fontWeight: 700, fontSize: 13 }}>{p.nameAr}</span></div>
              <span className="badge badge-plum">{p.reviewCount} تقييم</span>
            </div>
          ))}
          {lowStock > 0 && <Link to="/admin/products" className="btn btn-outline btn-block" style={{ marginTop: 18 }}><AlertTriangle size={15} /> {lowStock} منتج منخفض المخزون</Link>}
        </div>
      </div>
    </div>
  );
}
