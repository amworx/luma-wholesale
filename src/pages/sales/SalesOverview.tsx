import { Link } from 'react-router-dom';
import { Package, AlertTriangle, ShoppingCart, TrendingUp, ArrowLeft } from 'lucide-react';
import { useData, productStock, formatMoney } from '@/data/store';
import { StatCard } from '@/components/ui/Common';

export function SalesOverview() {
  const data = useData();
  if (!data) return null;
  const totalProducts = data.products.length;
  const totalStock = data.products.reduce((s, p) => s + productStock(p), 0);
  const lowStock = data.products.filter((p) => p.variants.some((v) => v.stock <= v.lowStockThreshold));
  const inventoryValue = data.products.reduce((s, p) => s + p.variants.reduce((a, v) => a + v.costPrice * v.stock, 0), 0);
  const newOrders = data.orders.filter((o) => o.status === 'new').length;
  const openEnquiries = data.enquiries.filter((e) => !e.handled).length;

  return (
    <div>
      <div className="row-between wrap" style={{ marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 24 }}>لوحة المبيعات</h2><p className="muted" style={{ fontSize: 13 }}>إدارة المنتجات والمخزون والطلبات</p></div>
        <Link to="/sales/products" className="btn btn-primary">إدارة المنتجات <ArrowLeft size={16} /></Link>
      </div>

      <div className="grid-4">
        <StatCard label="إجمالي المنتجات" value={String(totalProducts)} icon={<Package size={22} />} tone="plum" />
        <StatCard label="الوحدات في المخزون" value={String(totalStock)} icon={<TrendingUp size={22} />} tone="green" />
        <StatCard label="منتجات منخفضة المخزون" value={String(lowStock.length)} icon={<AlertTriangle size={22} />} tone="gold" />
        <StatCard label="طلبات جديدة" value={String(newOrders)} icon={<ShoppingCart size={22} />} tone="blue" />
      </div>

      <div className="grid-2" style={{ marginTop: 22, gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="card card-pad">
          <div className="row-between" style={{ marginBottom: 16 }}><h3 style={{ fontSize: 17 }}>منتجات تحتاج انتباهك</h3><Link to="/sales/inventory" className="btn btn-ghost btn-sm">كل المخزون</Link></div>
          {lowStock.length ? lowStock.slice(0, 6).map((p) => {
            const stock = productStock(p);
            return <div key={p.id} className="row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ gap: 10 }}><img src={p.images[0]} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} /><span style={{ fontWeight: 700, fontSize: 13 }}>{p.nameAr}</span></div>
              <span className={`badge ${stock === 0 ? 'badge-danger' : 'badge-warning'}`}>{stock} متبقي</span>
            </div>;
          }) : <p className="muted center" style={{ padding: 30 }}>كل المنتجات متوفرة بشكل جيد.</p>}
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>ملخص سريع</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="row-between"><span className="muted">قيمة المخزون (التكلفة)</span><strong style={{ color: 'var(--plum-700)' }}>{formatMoney(inventoryValue)}</strong></div>
            <div className="row-between"><span className="muted">الفئات النشطة</span><strong>{data.categories.filter((c) => c.active).length}</strong></div>
            <div className="row-between"><span className="muted">إجمالي الطلبات</span><strong>{data.orders.length}</strong></div>
            <div className="row-between"><span className="muted">استفسارات جديدة</span><strong>{openEnquiries}</strong></div>
            <div className="row-between"><span className="muted">منتجات مميزة</span><strong>{data.products.filter((p) => p.isFeatured).length}</strong></div>
          </div>
          <Link to="/sales/enquiries" className="btn btn-outline btn-block" style={{ marginTop: 12 }}>الاستفسارات والملاحظات</Link>
          <Link to="/sales/products" className="btn btn-outline btn-block" style={{ marginTop: 8 }}>إضافة أو تعديل المنتجات</Link>
        </div>
      </div>
    </div>
  );
}
