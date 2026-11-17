import { Link } from 'react-router-dom';
import { User, Package, LogOut, ShoppingBag } from 'lucide-react';
import { useData, useSession, store, formatMoney } from '@/data/store';
import { EmptyState } from '@/components/ui/Common';

const statusLabels: Record<string, { label: string; cls: string }> = {
  new: { label: 'جديد', cls: 'badge-info' }, processing: { label: 'قيد التجهيز', cls: 'badge-warning' },
  shipped: { label: 'تم الشحن', cls: 'badge-info' }, delivered: { label: 'تم التوصيل', cls: 'badge-success' },
  cancelled: { label: 'ملغي', cls: 'badge-danger' }, returned: { label: 'مرتجع', cls: 'badge-neutral' },
};

export function AccountPage() {
  const data = useData();
  const session = useSession();
  if (!data) return null;

  if (!session) {
    return <div className="container" style={{ padding: '60px 0' }}><EmptyState title="سجّل الدخول أولاً" description="سجّل الدخول لعرض طلباتك وبياناتك." action={<Link to="/login" className="btn btn-primary">تسجيل الدخول</Link>} /></div>;
  }

  const myOrders = data.orders.filter((o) => o.customerId === session.userId);

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div className="row" style={{ gap: 16, marginBottom: 28 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--plum-700)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 900 }}>{session.name.charAt(0)}</div>
        <div><h1 style={{ fontSize: 24 }}>مرحباً، {session.name}</h1><p className="muted">{session.role === 'customer' ? 'حسابي' : 'حساب الموظف'}</p></div>
      </div>

      <div className="grid-2 account-layout" style={{ gridTemplateColumns: '280px 1fr', alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="row" style={{ fontSize: 16, marginBottom: 18 }}><User size={18} color="var(--plum-600)" /> بيانات الحساب</h3>
          <div style={{ display: 'grid', gap: 14, fontSize: 13 }}>
            <div><span className="muted">الاسم</span><div style={{ fontWeight: 700 }}>{session.name}</div></div>
            <div><span className="muted">البريد الإلكتروني</span><div style={{ fontWeight: 700, textAlign: 'right' }} dir="ltr">{data.users.find((u) => u.id === session.userId)?.email}</div></div>
            <div><span className="muted">الصلاحية</span><div style={{ fontWeight: 700 }}>{session.role === 'admin' ? 'مدير النظام' : session.role === 'sales' ? 'فريق المبيعات' : 'عميل'}</div></div>
          </div>
          <button className="btn btn-outline btn-block" style={{ marginTop: 20 }} onClick={() => { store.logout(); window.location.href = '/store'; }}><LogOut size={16} /> تسجيل الخروج</button>
          {(session.role === 'admin' || session.role === 'sales') && (
            <Link to={session.role === 'admin' ? '/admin' : '/sales'} className="btn btn-primary btn-block" style={{ marginTop: 8 }}>لوحة التحكم</Link>
          )}
        </div>

        <div className="card">
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}><h3 className="row" style={{ fontSize: 16 }}><Package size={18} color="var(--plum-600)" /> طلباتي</h3></div>
          {myOrders.length ? myOrders.map((o) => {
            const st = statusLabels[o.status] || statusLabels.new;
            return (
              <div key={o.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <div className="row-between wrap" style={{ marginBottom: 10 }}>
                  <div className="row" style={{ gap: 10 }}><strong>{o.orderNumber}</strong><span className={`badge ${st.cls}`}>{st.label}</span></div>
                  <span className="muted" style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {o.lines.map((l, i) => <img key={i} src={l.image} alt="" title={l.productNameAr} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />)}
                  <div className="grow" />
                  <strong style={{ color: 'var(--plum-700)' }}>{formatMoney(o.total)}</strong>
                </div>
              </div>
            );
          }) : <EmptyState title="لا توجد طلبات بعد" description="عند إتمام أول طلب ستجده هنا." action={<ShoppingBag size={36} color="var(--ink-300)" />} />}
        </div>
      </div>
    </div>
  );
}
