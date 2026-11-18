import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon, Package, LogOut, ShoppingBag, Wallet, Truck, CheckCircle2, Clock,
  ChevronDown, MapPin, Phone, Mail, CalendarDays, Pencil, Save, X,
  Boxes, BadgeCheck, FileText, Home, AlertCircle, FileDown, Printer,
} from 'lucide-react';
import { useData, useSession, store, formatMoney } from '@/data/store';
import { exportReportPdf } from '@/data/exportPdf';
import { EmptyState } from '@/components/ui/Common';
import { useToast } from '@/components/ui/Toast';
import type { Order, OrderStatus, User } from '@/types';

const statusMeta: Record<OrderStatus, { label: string; cls: string; step: number }> = {
  new: { label: 'جديد', cls: 'badge-info', step: 1 },
  processing: { label: 'قيد التجهيز', cls: 'badge-warning', step: 2 },
  shipped: { label: 'تم الشحن', cls: 'badge-info', step: 3 },
  delivered: { label: 'تم التوصيل', cls: 'badge-success', step: 4 },
  cancelled: { label: 'ملغي', cls: 'badge-danger', step: 0 },
  returned: { label: 'مرتجع', cls: 'badge-neutral', step: 0 },
};

const steps: { label: string; icon: React.ReactNode }[] = [
  { label: 'تم الاستلام', icon: <FileText size={15} /> },
  { label: 'قيد التجهيز', icon: <Boxes size={15} /> },
  { label: 'تم الشحن', icon: <Truck size={15} /> },
  { label: 'تم التوصيل', icon: <CheckCircle2 size={15} /> },
];

type Tab = 'overview' | 'orders' | 'settings';

export function AccountPage() {
  const data = useData();
  const session = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password: string }>({ name: '', email: '', password: '' });

  const myOrders = useMemo(
    () => (data && session ? data.orders.filter((o) => o.customerId === session.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []),
    [data, session]
  );
  const me = data?.users.find((u) => u.id === session?.userId);

  const stats = useMemo(() => {
    const active = myOrders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned');
    const spent = active.reduce((s, o) => s + (o.quotedTotal ?? o.total), 0);
    const pending = myOrders.filter((o) => ['new', 'processing', 'shipped'].includes(o.status)).length;
    const delivered = myOrders.filter((o) => o.status === 'delivered').length;
    return { spent, pending, delivered, total: myOrders.length };
  }, [myOrders]);

  if (!data) return null;

  if (!session) {
    return <div className="container" style={{ padding: '60px 0' }}><EmptyState title="سجّل الدخول أولاً" description="سجّل الدخول لعرض طلباتك وبياناتك." action={<Link to="/login" className="btn btn-primary">تسجيل الدخول</Link>} /></div>;
  }

  const startEdit = () => {
    setForm({ name: session.name, email: me?.email || '', password: me?.password || '' });
    setEditing(true);
  };
  const saveProfile = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.show('أكمل الاسم والبريد وكلمة المرور', 'error'); return;
    }
    if (data.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== session.userId)) {
      toast.show('البريد مستخدم بالفعل', 'error'); return;
    }
    const updated: User = { ...me!, name: form.name.trim(), email: form.email.trim(), password: form.password };
    store.upsertUser(updated);
    store.setSession({ userId: session.userId, role: session.role, name: updated.name });
    setEditing(false);
    toast.show('تم حفظ بيانات الحساب', 'success');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: <Home size={17} /> },
    { id: 'orders', label: `طلباتي (${myOrders.length})`, icon: <Package size={17} /> },
    { id: 'settings', label: 'بيانات الحساب', icon: <UserIcon size={17} /> },
  ];

  return (
    <div className="profile-page container">
      {/* Cover + identity */}
      <div className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-identity">
          <div className="profile-avatar" style={{ background: me?.avatarColor || 'var(--plum-700)' }}>{session.name.charAt(0)}</div>
          <div className="profile-id-text">
            <h1>{session.name} <BadgeCheck size={19} className="profile-verified" /></h1>
            <div className="profile-id-meta">
              <span><Mail size={13} /> {me?.email}</span>
              <span><CalendarDays size={13} /> عضو منذ {new Date(me?.createdAt || Date.now()).toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
          <button className="btn btn-outline profile-logout" onClick={() => { store.logout(); navigate('/store'); }}><LogOut size={16} /> تسجيل الخروج</button>
        </div>
      </div>

      {/* Wholesale account status */}
      {me?.role === 'customer' && me.accountStatus !== 'active' && (
        <div className="badge badge-warning" style={{ marginTop: 16, padding: '12px 16px', width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13 }}>
          <Clock size={16} />
          {me.accountStatus === 'pending' && 'حسابك قيد المراجعة. سيتفعّل الطلب بالجملة بعد موافقة فريق المبيعات.'}
          {me.accountStatus === 'suspended' && 'حسابك موقوف مؤقتاً. تواصل مع فريق المبيعات.'}
          {me.accountStatus === 'rejected' && 'لم تتم الموافقة على حساب الجملة. تواصل مع فريق المبيعات.'}
        </div>
      )}

      {/* Tabs */}
      <div className="profile-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`profile-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="profile-body">
          <div className="profile-stats">
            <div className="pstat"><span className="pstat-icon" style={{ background: 'var(--rose-100)', color: 'var(--plum-700)' }}><Wallet size={20} /></span><div><small>إجمالي المشتريات</small><strong>{formatMoney(stats.spent)}</strong></div></div>
            <div className="pstat"><span className="pstat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><Clock size={20} /></span><div><small>طلبات قيد المعالجة</small><strong>{stats.pending}</strong></div></div>
            <div className="pstat"><span className="pstat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><CheckCircle2 size={20} /></span><div><small>طلبات مُسلّمة</small><strong>{stats.delivered}</strong></div></div>
            <div className="pstat"><span className="pstat-icon" style={{ background: '#fbf2dc', color: '#a6791f' }}><ShoppingBag size={20} /></span><div><small>كل الطلبات</small><strong>{stats.total}</strong></div></div>
          </div>

          <div className="profile-cols">
            <section className="card card-pad">
              <div className="row-between" style={{ marginBottom: 16 }}>
                <h3 className="row" style={{ fontSize: 17 }}><Package size={18} color="var(--plum-600)" /> أحدث الطلبات</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('orders')}>عرض الكل</button>
              </div>
              {myOrders.length ? myOrders.slice(0, 3).map((o) => <OrderRow key={o.id} order={o} onClick={() => { setTab('orders'); setExpanded(o.id); }} />)
                : <EmptyState title="لا توجد طلبات بعد" description="عند إتمام أول طلب ستجده هنا." action={<Link to="/store/categories" className="btn btn-primary btn-sm">تصفّح المنتجات</Link>} />}
            </section>

            <aside className="profile-side">
              <div className="card card-pad">
                <h3 className="row" style={{ fontSize: 16, marginBottom: 14 }}><UserIcon size={17} color="var(--plum-600)" /> بيانات سريعة</h3>
                <div className="profile-info-list">
                  <div><Mail size={15} /><span>{me?.email}</span></div>
                  <div><Phone size={15} /><span dir="ltr">{myOrders[0]?.address?.phone || '—'}</span></div>
                  <div><MapPin size={15} /><span>{myOrders[0]?.address ? `${myOrders[0].address.city}، ${myOrders[0].address.area}` : '—'}</span></div>
                </div>
                <button className="btn btn-outline btn-block" style={{ marginTop: 16 }} onClick={startEdit}><Pencil size={15} /> تعديل البيانات</button>
              </div>
              {(session.role === 'admin' || session.role === 'sales') && (
                <Link to={session.role === 'admin' ? '/admin' : '/sales'} className="btn btn-primary btn-block">لوحة التحكم</Link>
              )}
            </aside>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="profile-body">
          {myOrders.length ? myOrders.map((o) => (
            <OrderCard key={o.id} order={o} expanded={expanded === o.id} onToggle={() => setExpanded(expanded === o.id ? null : o.id)} />
          )) : <EmptyState title="لا توجد طلبات بعد" description="عند إتمام أول طلب ستجده هنا." action={<Link to="/store/categories" className="btn btn-primary btn-sm">تصفّح المنتجات</Link>} />}
        </div>
      )}

      {tab === 'settings' && (
        <div className="profile-body">
          <div className="card card-pad profile-settings">
            <div className="row-between wrap" style={{ marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 18 }}>بيانات الحساب</h3><p className="muted" style={{ fontSize: 12, marginTop: 3 }}>حدّث معلوماتك الشخصية وكلمة المرور.</p></div>
              {!editing && <button className="btn btn-primary btn-sm" onClick={startEdit}><Pencil size={15} /> تعديل</button>}
            </div>
            {editing ? (
              <div className="profile-form">
                <div className="field"><label>الاسم الكامل</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label>البريد الإلكتروني</label><input className="input" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="field"><label>كلمة المرور</label><input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn btn-primary" onClick={saveProfile}><Save size={16} /> حفظ التغييرات</button>
                  <button className="btn btn-outline" onClick={() => setEditing(false)}><X size={16} /> إلغاء</button>
                </div>
              </div>
            ) : (
              <div className="profile-info-list profile-info-lg">
                <div><UserIcon size={16} /><span>{session.name}</span></div>
                <div><Mail size={16} /><span dir="ltr">{me?.email}</span></div>
                <div><BadgeCheck size={16} /><span>{session.role === 'customer' ? 'عميل' : session.role === 'admin' ? 'مدير النظام' : 'فريق المبيعات'}</span></div>
              </div>
            )}
            <p className="muted" style={{ fontSize: 11, marginTop: 20 }}>ملاحظة: في النسخة التجريبية تُحفظ بيانات الحساب في قاعدة البيانات المشتركة.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const st = statusMeta[order.status] || statusMeta.new;
  return (
    <button className="order-row" onClick={onClick}>
      <div className="row" style={{ gap: 10 }}>
        <div className="order-row-icon"><ShoppingBag size={17} /></div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: 13 }}>{order.orderNumber}</strong>
          <div className="muted" style={{ fontSize: 11 }}>{new Date(order.createdAt).toLocaleDateString('ar-SA')} · {order.lines.length} أصناف</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}><span className={`badge ${st.cls}`}>{st.label}</span><strong style={{ color: 'var(--plum-700)', fontSize: 13 }}>{formatMoney(order.quotedTotal ?? order.total)}</strong></div>
    </button>
  );
}

function OrderCard({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  const st = statusMeta[order.status] || statusMeta.new;
  const step = st.step;
  return (
    <div className="card order-card">
      <button className="order-card-head" onClick={onToggle}>
        <div className="row wrap" style={{ gap: 12 }}>
          <div className="order-row-icon"><ShoppingBag size={18} /></div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: 15 }}>{order.orderNumber}</strong>
            <div className="muted" style={{ fontSize: 11 }}>تم الطلب في {new Date(order.createdAt).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <span className={`badge ${st.cls}`}>{st.label}</span>
          <strong style={{ color: 'var(--plum-700)', fontSize: 16 }}>{formatMoney(order.quotedTotal ?? order.total)}</strong>
          <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
      </button>
      {expanded && (
        <div className="order-card-body">
          {step > 0 && (
            <div className="order-track">
              {steps.map((s, i) => (
                <div key={s.label} className={`track-step ${i < step ? 'done' : ''} ${i === step - 1 ? 'current' : ''}`}>
                  <span className="track-dot">{i < step ? <CheckCircle2 size={16} /> : s.icon}</span>
                  <small>{s.label}</small>
                </div>
              ))}
            </div>
          )}
          <div className="order-detail-grid">
            <div>
              <h4 className="order-sub"><Package size={15} /> الأصناف</h4>
              {order.lines.map((l, i) => (
                <div key={i} className="order-line">
                  <img src={l.image} alt="" />
                  <div className="grow"><strong style={{ fontSize: 13 }}>{l.productNameAr}</strong><div className="muted" style={{ fontSize: 11 }}>{l.variantNameAr} · {l.quantity} × {formatMoney(l.unitPrice)}</div></div>
                  <strong style={{ fontSize: 13 }}>{formatMoney(l.lineTotal)}</strong>
                </div>
              ))}
              <div className="order-totals">
                <div><span>المجموع الفرعي</span><span>{formatMoney(order.subtotal)}</span></div>
                <div><span>الشحن</span><span>{order.shippingFee ? formatMoney(order.shippingFee) : 'مجاني'}</span></div>
                {order.discount > 0 && <div><span>خصم</span><span>- {formatMoney(order.discount)}</span></div>}
                {order.quotedTotal !== null && <div><span>السعر النهائي بعد مراجعة المبيعات</span><span>{formatMoney(order.quotedTotal)}</span></div>}
                <div className="order-total-final"><span>الإجمالي</span><span>{formatMoney(order.quotedTotal ?? order.total)}</span></div>
              </div>
            </div>
            <div>
              <h4 className="order-sub"><MapPin size={15} /> عنوان الشحن</h4>
              <div className="order-address">
                <div>{order.address.fullName}</div>
                {order.address.companyName && <div className="muted">{order.address.companyName}</div>}
                <div className="muted">{order.address.city}، {order.address.area}</div>
                <div className="muted">{order.address.street}، {order.address.building}</div>
                <div className="muted" dir="ltr">{order.address.phone}</div>
                {order.address.mapLabel && <div className="muted"><MapPin size={12} /> {order.address.mapLabel}</div>}
              </div>
              {order.handlingNotes && (
                <div className="order-note"><AlertCircle size={14} /> ملاحظة من المبيعات: {order.handlingNotes}</div>
              )}
            </div>
          </div>

          {/* Printable report + PDF export */}
          <div className="row wrap" style={{ gap: 8, marginTop: 18, borderTop: '1px dashed var(--line)', paddingTop: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => exportReportPdf(`طلب-${order.orderNumber}`)}><FileDown size={15} /> تصدير PDF</button>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer size={15} /> طباعة التقرير</button>
          </div>
          <div id="order-report" className="order-report" style={{ background: '#fff', border: '2px solid var(--line)', borderRadius: 14, padding: 20, textAlign: 'right', marginTop: 16 }}>
            <div className="row-between" style={{ borderBottom: '2px solid var(--plum-700)', paddingBottom: 12, marginBottom: 14 }}>
              <div><h3 style={{ fontSize: 18, color: 'var(--plum-700)' }}>{store.getSnapshot()?.settings.storeNameAr}</h3><p className="muted" style={{ fontSize: 11 }}>تقرير طلب شراء بالجملة</p></div>
              <div style={{ textAlign: 'left' }}><strong style={{ fontSize: 16 }}>{order.orderNumber}</strong><p className="muted" style={{ fontSize: 11 }}>{new Date(order.createdAt).toLocaleDateString('ar-SY')}</p></div>
            </div>
            <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 14 }}>
              <div><span className="muted">العميل: </span><strong>{order.customerName}</strong></div>
              <div><span className="muted">الهاتف: </span><strong dir="ltr" style={{ display: 'inline-block' }}>{order.customerPhone}</strong></div>
              <div><span className="muted">الجهة: </span><strong>{order.address.companyName || '—'}</strong></div>
              <div><span className="muted">المدينة: </span><strong>{order.address.city}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}><span className="muted">العنوان: </span><strong>{order.address.city}، {order.address.area}، {order.address.street}{order.address.building ? `، ${order.address.building}` : ''}</strong></div>
            </div>
            <table className="tbl" style={{ marginBottom: 12 }}>
              <thead><tr><th>المنتج</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead>
              <tbody>{order.lines.map((l, i) => (
                <tr key={i}><td>{l.productNameAr}</td><td className="muted">{l.variantNameAr}</td><td>{l.quantity}</td><td>{formatMoney(l.unitPrice)}</td><td style={{ fontWeight: 800 }}>{formatMoney(l.lineTotal)}</td></tr>
              ))}</tbody>
            </table>
            <div className="row-between"><span>المجموع الفرعي</span><strong>{formatMoney(order.subtotal)}</strong></div>
            <div className="row-between" style={{ marginTop: 6 }}><span>الشحن</span><strong>{order.shippingFee ? formatMoney(order.shippingFee) : '—'}</strong></div>
            <div className="row-between" style={{ marginTop: 10, fontSize: 16, color: 'var(--plum-700)' }}><strong>الإجمالي</strong><strong>{formatMoney(order.quotedTotal ?? order.total)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
