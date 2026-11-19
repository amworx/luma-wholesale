import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Trash2, Minus, Plus, ArrowLeft, Truck, Tag, AlertCircle } from 'lucide-react';
import { useData, formatMoney } from '@/data/store';
import { useCart } from '@/state/CartContext';
import { EmptyState } from '@/components/ui/Common';
import { useToast } from '@/components/ui/Toast';

export function CartPage() {
  const data = useData();
  const { priced, setQty, remove, clear, subtotal, hasInvalid } = useCart();
  const toast = useToast();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  if (!data) return null;

  const details = priced.map((line) => {
    const p = data.products.find((x) => x.id === line.productId)!;
    const v = p.variants.find((x) => x.id === line.variantId)!;
    return { line, p, v };
  }).filter((d) => d.p && d.v);

  const shipping = subtotal >= data.settings.freeShippingOver ? 0 : data.settings.defaultShippingFee;
  const total = subtotal + shipping;

  if (!details.length) {
    return <div className="container" style={{ padding: '60px 0' }}><EmptyState title="سلة المشتريات فارغة" description="تصفّح تشكيلة لُما واختر المنتجات التي تحتاجها." action={<Link to="/store/categories" className="btn btn-primary">تصفّح المنتجات <ArrowLeft size={16} /></Link>} /></div>;
  }

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div className="row-between wrap" style={{ marginBottom: 20, gap: 10 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>سلة المشتريات <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}>({priced.reduce((s, l) => s + l.quantity, 0)} منتج)</span></h1>
        <button className="btn btn-outline btn-sm" onClick={() => setConfirmEmpty(true)}><Trash2 size={15} /> إفراغ السلة</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 26, alignItems: 'start' }} className="cart-layout">
        <div className="card">
          {details.map(({ line, p, v }) => (
            <div key={`${line.productId}-${line.variantId}`} className="cart-line">
              <img src={p.images[0]} alt={p.nameAr} />
              <div className="cart-line-body">
                <div className="cart-line-top">
                  <Link to={`/store/product/${p.id}`} className="cart-line-name">{p.nameAr}</Link>
                  <button className="btn-icon" onClick={() => remove(line.productId, line.variantId)} title="حذف هذا المنتج" aria-label="حذف"><Trash2 size={17} color="var(--danger)" /></button>
                </div>
                <div className="muted cart-line-sku">{v.nameAr} · SKU: <span dir="ltr">{v.sku}</span></div>
                <div className="cart-line-prices">
                  <span style={{ color: 'var(--plum-700)', fontWeight: 900 }}>{formatMoney(line.unitPrice)}</span>
                  {line.unitPrice < (v.salePrice ?? v.retailPrice) && <span className="muted" style={{ textDecoration: 'line-through', fontSize: 12 }}>{formatMoney(v.salePrice ?? v.retailPrice)}</span>}
                  {line.source !== 'base' && <span className="badge badge-info" style={{ fontSize: 9 }}><Tag size={10} /> {line.tierLabel}</span>}
                </div>
                {!line.qtyValid && <div className="cart-line-invalid"><AlertCircle size={13} /> <span>{line.qtyMessage} · </span><button className="link-btn" onClick={() => setQty(line.productId, line.variantId, line.adjustedQty)}>اضبطها إلى {line.adjustedQty}</button></div>}
                <div className="cart-line-controls">
                  <div className="row" style={{ gap: 0, border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
                    <button className="btn-icon" onClick={() => setQty(line.productId, line.variantId, line.quantity - 1)} aria-label="إنقاص"><Minus size={14} /></button>
                    <span style={{ width: 30, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{line.quantity}</span>
                    <button className="btn-icon" onClick={() => setQty(line.productId, line.variantId, Math.min(v.stock, line.quantity + 1))} aria-label="زيادة"><Plus size={14} /></button>
                  </div>
                  <strong className="cart-line-total">{formatMoney(line.lineTotal)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad" style={{ position: 'sticky', top: 84 }}>
          <h3 style={{ fontSize: 18, marginBottom: 18 }}>ملخص الطلب</h3>
          <div className="row-between" style={{ marginBottom: 12, fontSize: 14 }}><span className="muted">المجموع الفرعي</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="row-between" style={{ marginBottom: 12, fontSize: 14 }}><span className="muted">الشحن</span><strong style={{ color: shipping === 0 ? 'var(--success)' : 'inherit' }}>{shipping === 0 ? 'مجاني' : formatMoney(shipping)}</strong></div>
          <div style={{ borderTop: '1px dashed var(--line)', margin: '16px 0' }} />
          <div className="row-between" style={{ marginBottom: 18 }}><strong style={{ fontSize: 16 }}>الإجمالي</strong><strong style={{ fontSize: 22, color: 'var(--plum-700)' }}>{formatMoney(total)}</strong></div>
          <p className="muted" style={{ fontSize: 11, marginBottom: 14, lineHeight: 1.7 }}>الأسعار تقديرية حسب الكمية ونوع العميل، ويؤكدها فريق المبيعات نهائياً.</p>
          {hasInvalid && <div className="cart-invalid-summary"><AlertCircle size={15} /><span>{priced.filter((l) => !l.qtyValid).length} منتجات تحتاج ضبط الكمية — راجع التنبيهات في القائمة.</span></div>}
          {shipping > 0 && <div className="badge badge-info" style={{ marginBottom: 16, width: '100%', justifyContent: 'center' }}><Truck size={14} /> أضف {formatMoney(data.settings.freeShippingOver - subtotal)} للشحن المجاني</div>}
          <Link to={hasInvalid ? '#' : '/store/checkout'} className={`btn btn-primary btn-lg btn-block ${hasInvalid ? 'disabled' : ''}`} onClick={(e) => { if (hasInvalid) e.preventDefault(); }}>إرسال طلب الشراء <ArrowLeft size={18} /></Link>
          <Link to="/store/bulk-order" className="btn btn-outline btn-block" style={{ marginTop: 8 }}>طلب كميات كبيرة</Link>
          <Link to="/store/categories" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>متابعة التصفح</Link>
        </div>
      </div>

      {confirmEmpty && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmEmpty(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="إفراغ السلة">
            <div className="modal-head"><h3 style={{ fontSize: 19 }}>إفراغ السلة؟</h3><button className="modal-close" onClick={() => setConfirmEmpty(false)} aria-label="إغلاق">×</button></div>
            <div className="modal-body">سيتم حذف كل المنتجات المضافة ({priced.length} أصناف). لا يمكن التراجع عن هذا الإجراء.</div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmEmpty(false)}>إلغاء</button>
              <button className="btn btn-danger" onClick={() => { clear(); setConfirmEmpty(false); toast.show('تم إفراغ السلة', 'success'); }}><Trash2 size={16} /> إفراغ السلة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
