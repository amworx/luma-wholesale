import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle2, FileText, Printer, PackageCheck } from 'lucide-react';
import { useData, store, effectivePrice, formatMoney } from '@/data/store';
import { useCart } from '@/state/CartContext';
import { useSession } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import type { Order, ShippingAddress } from '@/types';

const emptyAddress: ShippingAddress = {
  fullName: '', phone: '', city: '', area: '', street: '', notes: '',
  companyName: '', phone2: '', email: '', postalCode: '', building: '', landmarks: '', deliveryTime: '',
};

export function CheckoutPage() {
  const data = useData();
  const session = useSession();
  const { lines, subtotal, clear } = useCart();
  const toast = useToast();
  const [address, setAddress] = useState<ShippingAddress>({ ...emptyAddress, fullName: session?.name || '' });
  const [placed, setPlaced] = useState<Order | null>(null);
  const set = (k: keyof ShippingAddress, v: string) => setAddress((a) => ({ ...a, [k]: v }));

  if (!data) return null;
  const details = lines.map((line) => {
    const p = data.products.find((x) => x.id === line.productId)!;
    const v = p.variants.find((x) => x.id === line.variantId)!;
    return { line, p, v, price: effectivePrice(v) };
  }).filter((d) => d.p && d.v);
  const shipping = subtotal >= data.settings.freeShippingOver ? 0 : data.settings.defaultShippingFee;
  const total = subtotal + shipping;

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.city || !address.street) {
      toast.show('يرجى تعبئة الاسم ورقم الهاتف والمدينة والشارع', 'error'); return;
    }
    const orderNumber = `LM-${1000 + data.orders.length + 1}`;
    const order: Order = {
      id: `o-${Date.now()}`, orderNumber,
      customerId: session?.userId || null,
      customerName: address.fullName, customerPhone: address.phone,
      lines: details.map(({ line, p, v, price }) => ({
        productId: p.id, variantId: v.id, productNameAr: p.nameAr, variantNameAr: v.nameAr,
        image: p.images[0], unitPrice: price, quantity: line.quantity, lineTotal: price * line.quantity,
      })),
      subtotal, shippingFee: shipping, discount: 0, total,
      status: 'new', paymentMethod: 'pending', address,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), notes: address.notes,
      handledBy: '', handlingNotes: '', quotedTotal: null, handledAt: '',
    };
    // No stock decrement and no payment here: the sales team handles the rest manually.
    store.upsertOrder(order);
    clear();
    setPlaced(order);
    toast.show('تم إرسال طلب الشراء إلى فريق المبيعات', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (placed) {
    return (
      <div className="container" style={{ padding: '60px 20px', maxWidth: 760 }}>
        <div className="card card-pad center" style={{ padding: 50 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}><CheckCircle2 size={44} /></div>
          <h1 style={{ fontSize: 26, marginBottom: 10 }}>تم استلام طلبك</h1>
          <p className="muted" style={{ marginBottom: 24, lineHeight: 1.9 }}>
            سيقوم فريق المبيعات بمراجعة الطلب والتواصل معك لتأكيد الكميات والسعر النهائي وترتيب الشحن. لا يوجد دفع داخل التطبيق.
          </p>

          {/* Printable order report */}
          <div id="order-report" className="order-report" style={{ background: '#fff', border: '2px solid var(--line)', borderRadius: 14, padding: 24, textAlign: 'right', marginBottom: 24 }}>
            <div className="row-between" style={{ borderBottom: '2px solid var(--plum-700)', paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 22, color: 'var(--plum-700)' }}>{data.settings.storeNameAr}</h2>
                <p className="muted" style={{ fontSize: 12 }}>تقرير طلب شراء بالجملة</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: 18 }}>{placed.orderNumber}</strong>
                <p className="muted" style={{ fontSize: 12 }}>{new Date(placed.createdAt).toLocaleDateString('ar-SY')}</p>
              </div>
            </div>
            <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 18 }}>
              <div><span className="muted">العميل: </span><strong>{placed.customerName}</strong></div>
              <div><span className="muted">الهاتف: </span><strong dir="ltr" style={{ display: 'inline-block' }}>{placed.customerPhone}</strong></div>
              <div><span className="muted">الجهة: </span><strong>{placed.address.companyName || '—'}</strong></div>
              <div><span className="muted">المدينة: </span><strong>{placed.address.city}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}><span className="muted">العنوان: </span><strong>{placed.address.city}، {placed.address.area}، {placed.address.street}{placed.address.building ? `، ${placed.address.building}` : ''}</strong></div>
            </div>
            <table className="tbl" style={{ marginBottom: 14 }}>
              <thead><tr><th>المنتج</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead>
              <tbody>
                {placed.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.productNameAr}</td><td className="muted">{l.variantNameAr}</td>
                    <td>{l.quantity}</td><td>{formatMoney(l.unitPrice)}</td>
                    <td style={{ fontWeight: 800 }}>{formatMoney(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row-between" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}><span>المجموع الفرعي</span><strong>{formatMoney(placed.subtotal)}</strong></div>
            <div className="row-between" style={{ marginTop: 6 }}><span>الشحن التقديري</span><strong>{placed.shippingFee ? formatMoney(placed.shippingFee) : '—'}</strong></div>
            <div className="row-between" style={{ marginTop: 10, fontSize: 18, color: 'var(--plum-700)' }}><strong>الإجمالي التقديري</strong><strong>{formatMoney(placed.total)}</strong></div>
            <p className="muted" style={{ fontSize: 11, marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              تقديري فقط — يخضع للمراجعة النهائية من فريق المبيعات. يُرجى تسليم هذا التقرير للمندوب عند التواصل.
            </p>
          </div>

          <div className="row wrap" style={{ gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> طباعة التقرير</button>
            <Link to="/store" className="btn btn-outline">العودة للمتجر</Link>
            <Link to="/store/account" className="btn btn-ghost">طلباتي</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!details.length) {
    return <div className="container" style={{ padding: 60, textAlign: 'center' }}><h2>سلة المشتريات فارغة</h2><Link to="/store/categories" className="btn btn-primary" style={{ marginTop: 16 }}>تصفح المنتجات</Link></div>;
  }

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <h1 className="section-title" style={{ marginBottom: 8 }}>إرسال طلب شراء</h1>
      <p className="muted" style={{ marginBottom: 24 }}>اختر المنتجات وحدد عنوان الشحن بدقة. سيتواصل معك فريق المبيعات لتأكيد الطلب — لا توجد عملية دفع داخل التطبيق.</p>
      <form onSubmit={placeOrder} style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 26, alignItems: 'start' }} className="cart-layout">
        <div style={{ display: 'grid', gap: 18 }}>
          {/* Shipping address */}
          <div className="card card-pad">
            <h3 className="row" style={{ fontSize: 18, marginBottom: 6 }}><MapPin size={20} color="var(--plum-600)" /> عنوان الشحن والتوصيل</h3>
            <p className="muted" style={{ fontSize: 12, marginBottom: 18 }}>يرجى إدخال البيانات بدقة ليسهل على فريق المبيعات التواصل والتوصيل.</p>
            <div className="grid-2">
              <div className="field"><label>الاسم الكامل *</label><input className="input" required value={address.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="الاسم الكامل" /></div>
              <div className="field"><label>اسم الجهة / الشركة</label><input className="input" value={address.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="صيدلية، مركز تجميل، متجر..." /></div>
              <div className="field"><label>رقم الهاتف الأساسي *</label><input className="input" required dir="ltr" value={address.phone} onChange={(e) => set('phone', e.target.value)} placeholder="09xxxxxxxx" /></div>
              <div className="field"><label>رقم هاتف إضافي</label><input className="input" dir="ltr" value={address.phone2} onChange={(e) => set('phone2', e.target.value)} placeholder="اختياري" /></div>
              <div className="field"><label>البريد الإلكتروني</label><input className="input" dir="ltr" type="email" value={address.email} onChange={(e) => set('email', e.target.value)} placeholder="example@email.com" /></div>
              <div className="field"><label>المحافظة *</label>
                <select className="select" required value={address.city} onChange={(e) => set('city', e.target.value)}>
                  <option value="">اختر المحافظة</option>
                  {['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'درعا', 'السويداء', 'القنيطرة', 'دير الزور', 'الرقة', 'الحسكة', 'إدلب'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>المدينة / المنطقة *</label><input className="input" required value={address.area} onChange={(e) => set('area', e.target.value)} placeholder="مثال: المالكي" /></div>
              <div className="field"><label>الرمز البريدي</label><input className="input" dir="ltr" value={address.postalCode} onChange={(e) => set('postalCode', e.target.value)} placeholder="اختياري" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>الشارع والتفاصيل *</label><input className="input" required value={address.street} onChange={(e) => set('street', e.target.value)} placeholder="اسم الشارع، رقم المبنى" /></div>
              <div className="field"><label>الطابق / الشقة</label><input className="input" value={address.building} onChange={(e) => set('building', e.target.value)} placeholder="مثال: طابق 3، شقة 2" /></div>
              <div className="field"><label>أقرب معلم</label><input className="input" value={address.landmarks} onChange={(e) => set('landmarks', e.target.value)} placeholder="مسجد، مركز تجاري..." /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>وقت التوصيل المفضل</label>
                <select className="select" value={address.deliveryTime} onChange={(e) => set('deliveryTime', e.target.value)}>
                  <option value="">بدون تفضيل</option><option value="morning">صباحاً (9 ص - 12 م)</option><option value="afternoon">ظهراً (12 م - 5 م)</option><option value="evening">مساءً (5 م - 9 م)</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>ملاحظات إضافية</label><textarea className="textarea" value={address.notes} onChange={(e) => set('notes', e.target.value)} placeholder="أي تفاصيل تساعد فريق المبيعات..." /></div>
            </div>
          </div>

          <div className="card card-pad" style={{ background: 'var(--rose-50)', borderColor: 'var(--plum-200)' }}>
            <h3 className="row" style={{ fontSize: 16, marginBottom: 10 }}><PackageCheck size={20} color="var(--plum-600)" /> ماذا يحدث بعد الإرسال؟</h3>
            <ol className="muted" style={{ fontSize: 13, lineHeight: 2, margin: 0, paddingInlineStart: 20 }}>
              <li>يستلم فريق المبيعات تقرير الطلب ويتواصل معك لتأكيد الكميات.</li>
              <li>يتم الاتفاق على السعر النهائي وطريقة الدفع مباشرة مع المندوب.</li>
              <li>تجهيز الطلب وشحنه إلى العنوان الذي أدخلته.</li>
            </ol>
          </div>
        </div>

        {/* Summary */}
        <div className="card card-pad" style={{ position: 'sticky', top: 84 }}>
          <h3 className="row" style={{ fontSize: 18, marginBottom: 18 }}><FileText size={18} color="var(--plum-600)" /> ملخص الطلب</h3>
          {details.map(({ line, p, v, price }) => (
            <div key={v.id} className="row-between" style={{ fontSize: 13, marginBottom: 10 }}>
              <span className="truncate" style={{ maxWidth: 180 }}>{p.nameAr} × {line.quantity}</span>
              <strong>{formatMoney(price * line.quantity)}</strong>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed var(--line)', margin: '16px 0' }} />
          <div className="row-between" style={{ marginBottom: 10, fontSize: 14 }}><span className="muted">المجموع الفرعي</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="row-between" style={{ marginBottom: 16, fontSize: 14 }}><span className="muted">الشحن التقديري</span><strong>{shipping === 0 ? 'مجاني' : formatMoney(shipping)}</strong></div>
          <div className="row-between" style={{ marginBottom: 8 }}><strong>الإجمالي التقديري</strong><strong style={{ fontSize: 22, color: 'var(--plum-700)' }}>{formatMoney(total)}</strong></div>
          <p className="muted" style={{ fontSize: 11, marginBottom: 18, lineHeight: 1.7 }}>السعر تقديري وقد يتغير بعد مراجعة فريق المبيعات.</p>
          <button type="submit" className="btn btn-primary btn-lg btn-block"><FileText size={16} /> إرسال طلب الشراء</button>
          <p className="muted center" style={{ fontSize: 11, marginTop: 12 }}>لن يتم تحقيق أي دفع داخل التطبيق.</p>
        </div>
      </form>
    </div>
  );
}
