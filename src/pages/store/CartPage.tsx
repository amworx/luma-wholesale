import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowLeft, Truck, Tag } from 'lucide-react';
import { useData, formatMoney } from '@/data/store';
import { useCart } from '@/state/CartContext';
import { EmptyState } from '@/components/ui/Common';

export function CartPage() {
  const data = useData();
  const { priced, setQty, remove, subtotal } = useCart();
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
      <h1 className="section-title" style={{ marginBottom: 24 }}>سلة المشتريات <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}>({priced.reduce((s, l) => s + l.quantity, 0)} منتج)</span></h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 26, alignItems: 'start' }} className="cart-layout">
        <div className="card">
          {details.map(({ line, p, v }) => (
            <div key={`${line.productId}-${line.variantId}`} className="cart-line">
              <img src={p.images[0]} alt={p.nameAr} />
              <div className="grow" style={{ minWidth: 0 }}>
                <Link to={`/store/product/${p.id}`} style={{ fontWeight: 800, fontSize: 14 }}>{p.nameAr}</Link>
                <div className="muted" style={{ fontSize: 12 }}>{v.nameAr} · SKU: <span dir="ltr">{v.sku}</span></div>
                <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--plum-700)', fontWeight: 900 }}>{formatMoney(line.unitPrice)}</span>
                  {line.unitPrice < (v.salePrice ?? v.retailPrice) && <span className="muted" style={{ textDecoration: 'line-through', fontSize: 12 }}>{formatMoney(v.salePrice ?? v.retailPrice)}</span>}
                  {line.source !== 'base' && <span className="badge badge-info" style={{ fontSize: 9 }}><Tag size={10} /> {line.tierLabel}</span>}
                </div>
              </div>
              <div className="row" style={{ gap: 0, border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
                <button className="btn-icon" onClick={() => setQty(line.productId, line.variantId, line.quantity - 1)}><Minus size={14} /></button>
                <span style={{ width: 30, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{line.quantity}</span>
                <button className="btn-icon" onClick={() => setQty(line.productId, line.variantId, Math.min(v.stock, line.quantity + 1))}><Plus size={14} /></button>
              </div>
              <strong style={{ minWidth: 80, textAlign: 'left' }}>{formatMoney(line.lineTotal)}</strong>
              <button className="btn-icon" onClick={() => remove(line.productId, line.variantId)} title="حذف"><Trash2 size={17} color="var(--danger)" /></button>
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
          {shipping > 0 && <div className="badge badge-info" style={{ marginBottom: 16, width: '100%', justifyContent: 'center' }}><Truck size={14} /> أضف {formatMoney(data.settings.freeShippingOver - subtotal)} للشحن المجاني</div>}
          <Link to="/store/checkout" className="btn btn-primary btn-lg btn-block">إرسال طلب الشراء <ArrowLeft size={18} /></Link>
          <Link to="/store/bulk-order" className="btn btn-outline btn-block" style={{ marginTop: 8 }}>طلب كميات كبيرة</Link>
          <Link to="/store/categories" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>متابعة التصفح</Link>
        </div>
      </div>
    </div>
  );
}
