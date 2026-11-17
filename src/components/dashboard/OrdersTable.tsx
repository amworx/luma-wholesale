import { useState } from 'react';
import { Search, Eye, Trash2, Printer, UserCheck } from 'lucide-react';
import { useData, store, formatMoney } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmButton, EmptyState } from '@/components/ui/Common';
import type { Order, OrderStatus, PaymentMethod } from '@/types';

const statuses: { key: OrderStatus; label: string; cls: string }[] = [
  { key: 'new', label: 'جديد', cls: 'badge-info' }, { key: 'processing', label: 'قيد التجهيز', cls: 'badge-warning' },
  { key: 'shipped', label: 'تم الشحن', cls: 'badge-info' }, { key: 'delivered', label: 'تم التوصيل', cls: 'badge-success' },
  { key: 'cancelled', label: 'ملغي', cls: 'badge-danger' }, { key: 'returned', label: 'مرتجع', cls: 'badge-neutral' },
];
const payments: { key: PaymentMethod; label: string }[] = [
  { key: 'pending', label: 'يحددها المبيعات' }, { key: 'cod', label: 'عند الاستلام' },
  { key: 'card', label: 'بطاقة' }, { key: 'bank_transfer', label: 'تحويل بنكي' },
];
const payLabel = (p: PaymentMethod) => payments.find((x) => x.key === p)?.label || 'يحددها المبيعات';

export function OrdersTable({ compact }: { compact?: boolean }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<Order | null>(null);

  if (!data) return null;
  let orders = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) orders = orders.filter((o) => o.status === status);
  if (search) { const q = search.toLowerCase(); orders = orders.filter((o) => o.orderNumber.toLowerCase().includes(q) || o.customerName.includes(q) || o.customerPhone.includes(q)); }

  const patch = (o: Order, changes: Partial<Order>) => {
    const next = { ...o, ...changes, updatedAt: new Date().toISOString() };
    store.upsertOrder(next);
    setViewing(next);
  };
  const setStatusOf = (o: Order, s: OrderStatus) => { patch(o, { status: s }); toast.show('تم تحديث حالة الطلب', 'success'); };

  return (
    <>
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}><Search size={17} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو العميل..." style={{ paddingRight: 38 }} /></div>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 180 }}><option value="">كل الحالات</option>{statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        </div>
        {orders.length ? <div className="table-wrap"><table className="tbl">
          <thead><tr><th>رقم الطلب</th><th>العميل</th><th>التاريخ</th><th>الإجمالي التقديري</th><th>الدفع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>{orders.map((o) => {
            const st = statuses.find((s) => s.key === o.status)!;
            return <tr key={o.id}>
              <td><strong>{o.orderNumber}</strong></td>
              <td><div style={{ fontWeight: 700 }}>{o.customerName}</div><div className="muted" style={{ fontSize: 11 }} dir="ltr">{o.customerPhone}</div></td>
              <td className="muted" style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('ar-SY')}</td>
              <td style={{ fontWeight: 800, color: 'var(--plum-700)' }}>{formatMoney(o.quotedTotal ?? o.total)}</td>
              <td className="muted" style={{ fontSize: 12 }}>{payLabel(o.paymentMethod)}</td>
              <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
              <td><div className="row" style={{ gap: 4 }}><button className="btn-icon" onClick={() => setViewing(o)} title="تفاصيل ومعالجة"><Eye size={16} /></button>{!compact && <ConfirmButton onConfirm={() => { store.deleteOrder(o.id); toast.show('تم حذف الطلب', 'success'); }}><Trash2 size={16} /></ConfirmButton>}</div></td>
            </tr>;
          })}</tbody>
        </table></div> : <EmptyState title="لا توجد طلبات" description="ستظهر طلبات الشراء هنا بعد إرسال العملاء لها." />}
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`تقرير الطلب ${viewing?.orderNumber || ''}`} wide
        footer={<><button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> طباعة التقرير</button><button className="btn btn-outline" onClick={() => setViewing(null)}>إغلاق</button></>}>
        {viewing && <div style={{ display: 'grid', gap: 20 }}>
          {/* Printable order report */}
          <div id="order-report" className="order-report" style={{ background: '#fff', border: '2px solid var(--line)', borderRadius: 14, padding: 20, textAlign: 'right' }}>
            <div className="row-between" style={{ borderBottom: '2px solid var(--plum-700)', paddingBottom: 12, marginBottom: 16 }}>
              <div><h2 style={{ fontSize: 20, color: 'var(--plum-700)' }}>{data.settings.storeNameAr}</h2><p className="muted" style={{ fontSize: 12 }}>تقرير طلب شراء بالجملة</p></div>
              <div style={{ textAlign: 'left' }}><strong style={{ fontSize: 18 }}>{viewing.orderNumber}</strong><p className="muted" style={{ fontSize: 12 }}>{new Date(viewing.createdAt).toLocaleDateString('ar-SY')}</p></div>
            </div>
            <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 16 }}>
              <div><span className="muted">العميل: </span><strong>{viewing.customerName}</strong></div>
              <div><span className="muted">الهاتف: </span><strong dir="ltr" style={{ display: 'inline-block' }}>{viewing.customerPhone}</strong></div>
              <div><span className="muted">الجهة: </span><strong>{viewing.address.companyName || '—'}</strong></div>
              <div><span className="muted">هاتف إضافي: </span><strong dir="ltr" style={{ display: 'inline-block' }}>{viewing.address.phone2 || '—'}</strong></div>
              <div><span className="muted">البريد: </span><strong dir="ltr" style={{ display: 'inline-block' }}>{viewing.address.email || '—'}</strong></div>
              <div><span className="muted">المحافظة: </span><strong>{viewing.address.city}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}><span className="muted">العنوان: </span><strong>{viewing.address.city}، {viewing.address.area}، {viewing.address.street}{viewing.address.building ? `، ${viewing.address.building}` : ''}{viewing.address.landmarks ? `، بالقرب من ${viewing.address.landmarks}` : ''}</strong></div>
              {viewing.address.deliveryTime && <div><span className="muted">وقت التوصيل: </span><strong>{viewing.address.deliveryTime === 'morning' ? 'صباحاً' : viewing.address.deliveryTime === 'afternoon' ? 'ظهراً' : 'مساءً'}</strong></div>}
            </div>
            <table className="tbl" style={{ marginBottom: 12 }}>
              <thead><tr><th>المنتج</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead>
              <tbody>{viewing.lines.map((l, i) => (
                <tr key={i}><td>{l.productNameAr}</td><td className="muted">{l.variantNameAr}</td><td>{l.quantity}</td><td>{formatMoney(l.unitPrice)}</td><td style={{ fontWeight: 800 }}>{formatMoney(l.lineTotal)}</td></tr>
              ))}</tbody>
            </table>
            <div className="row-between"><span>المجموع الفرعي</span><strong>{formatMoney(viewing.subtotal)}</strong></div>
            <div className="row-between" style={{ marginTop: 6 }}><span>الشحن التقديري</span><strong>{viewing.shippingFee ? formatMoney(viewing.shippingFee) : '—'}</strong></div>
            <div className="row-between" style={{ marginTop: 10, fontSize: 17, color: 'var(--plum-700)' }}><strong>الإجمالي التقديري</strong><strong>{formatMoney(viewing.total)}</strong></div>
            {viewing.address.notes && <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>ملاحظات العميل: {viewing.address.notes}</p>}
          </div>

          {/* Sales-side manual handling */}
          <div className="card card-pad" style={{ background: 'var(--rose-50)' }}>
            <h3 className="row" style={{ fontSize: 16, marginBottom: 14 }}><UserCheck size={19} color="var(--plum-600)" /> معالجة الطلب (فريق المبيعات)</h3>
            <div className="grid-2">
              <div className="field"><label>السعر النهائي المتفق عليه ($)</label><input className="input" type="number" min={0} step="0.01" value={viewing.quotedTotal === null ? '' : viewing.quotedTotal / 100} onChange={(e) => patch(viewing, { quotedTotal: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} placeholder="اتركه فارغاً للإجمالي التقديري" /></div>
              <div className="field"><label>طريقة الدفع (يحددها المبيعات)</label><select className="select" value={viewing.paymentMethod} onChange={(e) => patch(viewing, { paymentMethod: e.target.value as PaymentMethod })}>{payments.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>المندوب المسؤول</label><input className="input" value={viewing.handledBy} onChange={(e) => patch(viewing, { handledBy: e.target.value, handledAt: viewing.handledAt || new Date().toISOString() })} placeholder="اسم مندوب المبيعات" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>ملاحظات داخلية (لا تظهر للعميل)</label><textarea className="textarea" value={viewing.handlingNotes} onChange={(e) => patch(viewing, { handlingNotes: e.target.value })} placeholder="ملاحظات الفريق..." /></div>
            </div>
            <div className="field" style={{ marginTop: 14 }}><label>حالة الطلب</label><div className="row wrap">{statuses.map((s) => <button key={s.key} className={`btn btn-sm ${viewing.status === s.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusOf(viewing, s.key)}>{s.label}</button>)}</div></div>
          </div>
        </div>}
      </Modal>
    </>
  );
}
