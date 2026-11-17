import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, ShoppingBag, Truck, ShieldCheck, RotateCcw, Minus, Plus, Heart, ChevronLeft } from 'lucide-react';
import { useData, effectivePrice, formatMoney } from '@/data/store';
import { useCart } from '@/state/CartContext';
import { useToast } from '@/components/ui/Toast';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Common';

export function ProductPage() {
  const { id } = useParams();
  const data = useData();
  const { add } = useCart();
  const toast = useToast();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'desc' | 'shipping' | 'reviews'>('desc');

  if (!data) return null;
  const product = data.products.find((p) => p.id === id);
  if (!product) return <div className="container" style={{ padding: 40 }}><EmptyState title="المنتج غير موجود" action={<Link to="/store" className="btn btn-primary">العودة للمتجر</Link>} /></div>;

  const activeVariant = product.variants.find((v) => v.id === variantId) || product.variants[0];
  const price = effectivePrice(activeVariant);
  const related = data.products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 5);

  const addToCart = () => {
    if (activeVariant.stock === 0) return;
    add(product.id, activeVariant.id, qty);
    toast.show(`تمت إضافة ${qty} إلى السلة`, 'success');
  };

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div className="row" style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 18 }}>
        <Link to="/store">الرئيسية</Link><ChevronLeft size={13} />
        <Link to={`/store/category/${product.categoryId}`}>{data.categories.find((c) => c.id === product.categoryId)?.nameAr}</Link><ChevronLeft size={13} />
        <span>{product.nameAr}</span>
      </div>

      <div className="product-detail" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
        {/* Images */}
        <div>
          <div className="card" style={{ overflow: 'hidden', borderRadius: 'var(--r-xl)', aspectRatio: 1 }}>
            <img src={product.images[0]} alt={product.nameAr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            {product.images.map((im, i) => <div key={i} style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--plum-700)' }}><img src={im} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>)}
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
            <span className="badge badge-plum">{product.brand}</span>
            {product.isNew && <span className="badge badge-info">جديد</span>}
            {product.isFeatured && <span className="badge badge-warning">الأكثر مبيعاً</span>}
          </div>
          <h1 style={{ fontSize: 30, marginBottom: 8 }}>{product.nameAr}</h1>
          <p className="muted" style={{ marginBottom: 14 }}>{product.shortDescriptionAr}</p>
          <div className="row" style={{ gap: 6, marginBottom: 20 }}>
            <span className="row" style={{ gap: 3 }}>{[1,2,3,4,5].map((n) => <Star key={n} size={16} fill={n <= Math.round(product.rating) ? 'var(--gold-500)' : 'none'} color="var(--gold-500)" />)}</span>
            <strong style={{ fontSize: 13 }}>{product.rating}</strong>
            <span className="muted" style={{ fontSize: 12 }}>({product.reviewCount} تقييم)</span>
          </div>

          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--plum-700)' }}>{formatMoney(price)}</span>
              {activeVariant.salePrice !== null && <span className="muted" style={{ textDecoration: 'line-through', fontSize: 16 }}>{formatMoney(activeVariant.retailPrice)}</span>}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>شامل ضريبة القيمة المضافة</span>
          </div>

          {/* Variants */}
          <div style={{ marginBottom: 20 }}>
            <div className="row-between" style={{ marginBottom: 10 }}><strong style={{ fontSize: 14 }}>الخيار:</strong><span className="muted" style={{ fontSize: 12 }}>{activeVariant.nameAr}</span></div>
            <div className="row wrap" style={{ gap: 10 }}>
              {product.variants.map((v) => (
                <button key={v.id} onClick={() => { setVariantId(v.id); setQty(1); }}
                  className={`variant-chip ${activeVariant.id === v.id ? 'active' : ''} ${v.stock === 0 ? 'disabled' : ''}`}>
                  {v.colorHex && <span style={{ width: 16, height: 16, borderRadius: '50%', background: v.colorHex, border: '1px solid #ddd' }} />}
                  {v.nameAr}
                  {v.stock === 0 && <span style={{ fontSize: 10, color: 'var(--danger)' }}>نفد</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Stock + qty */}
          <div className="row wrap" style={{ gap: 16, marginBottom: 22 }}>
            <span className={`badge ${activeVariant.stock > 5 ? 'badge-success' : activeVariant.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
              {activeVariant.stock > 5 ? 'متوفر' : activeVariant.stock > 0 ? `بقي ${activeVariant.stock} فقط` : 'نفد المخزون'}
            </span>
            <div className="row" style={{ gap: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <button className="btn-icon" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
              <span style={{ width: 36, textAlign: 'center', fontWeight: 800 }}>{qty}</span>
              <button className="btn-icon" onClick={() => setQty(Math.min(activeVariant.stock, qty + 1))}><Plus size={16} /></button>
            </div>
          </div>

          <div className="row" style={{ gap: 10, marginBottom: 24 }}>
            <button className="btn btn-primary btn-lg grow" onClick={addToCart} disabled={activeVariant.stock === 0}>
              <ShoppingBag size={19} /> {activeVariant.stock === 0 ? 'غير متوفر' : 'أضف إلى السلة'}
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => toast.show('تمت الإضافة للمفضلة', 'info')} title="مفضلة"><Heart size={20} /></button>
          </div>

          <div className="card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="row" style={{ gap: 10, fontSize: 13 }}><Truck size={18} color="var(--plum-600)" /> <span>شحن سريع خلال 2-3 أيام عمل</span></div>
            <div className="row" style={{ gap: 10, fontSize: 13 }}><ShieldCheck size={18} color="var(--plum-600)" /> <span>منتج أصلي بضمان الجودة</span></div>
            <div className="row" style={{ gap: 10, fontSize: 13 }}><RotateCcw size={18} color="var(--plum-600)" /> <span>إرجاع مجاني خلال 14 يوماً</span></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginTop: 44, padding: '0 24px 24px' }}>
        <div className="row" style={{ gap: 6, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
          {([['desc', 'الوصف'], ['shipping', 'الشحن والتوصيل'], ['reviews', `التقييمات (${product.reviewCount})`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '14px 16px', border: 0, background: 'none', fontWeight: 800, fontSize: 14, color: tab === k ? 'var(--plum-700)' : 'var(--ink-500)', borderBottom: tab === k ? '2.5px solid var(--plum-700)' : '2.5px solid transparent' }}>{label}</button>
          ))}
        </div>
        {tab === 'desc' && <div style={{ lineHeight: 2, color: 'var(--ink-700)' }}><p>{product.descriptionAr}</p><div className="row wrap" style={{ gap: 8, marginTop: 16 }}>{product.tags.map((t) => <span key={t} className="badge badge-neutral">{t}</span>)}</div></div>}
        {tab === 'shipping' && <div style={{ lineHeight: 2, color: 'var(--ink-700)' }}><p>نشحن إلى جميع المحافظات السورية. رسوم الشحن {formatMoney(product.shippingFee)}، وشحن مجاني للطلبات فوق {formatMoney(product.freeShippingOver || data.settings.freeShippingOver)}.</p><p>مدة التوصيل من 2 إلى 5 أيام عمل حسب المنطقة. يتم تأكيد موعد التوصيل مع فريق المبيعات.</p></div>}
        {tab === 'reviews' && <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-500)' }}><Star size={32} color="var(--gold-500)" /><h3 style={{ fontSize: 22, margin: '8px 0' }}>{product.rating} / 5</h3><p>بناءً على {product.reviewCount} تقييم من عملائنا.</p></div>}
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 50 }}>
          <h2 className="section-title" style={{ marginBottom: 20, fontSize: 24 }}>قد يعجبك أيضاً</h2>
          <div className="products-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
