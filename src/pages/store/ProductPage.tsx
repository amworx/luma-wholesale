import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Star, ShoppingBag, Truck, ShieldCheck, RotateCcw, Minus, Plus, Heart,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Share2, X, Maximize2,
  MessageSquareText, Send, Tag,
} from 'lucide-react';
import { useData, useSession, store, formatMoney } from '@/data/store';
import { checkQuantity, resolveUnitPrice } from '@/data/pricing';
import { useCart } from '@/state/CartContext';
import { useFavorites } from '@/state/FavoritesContext';
import { useToast } from '@/components/ui/Toast';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Common';
import type { EnquiryType } from '@/types';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function ProductPage() {
  const { id } = useParams();
  const data = useData();
  const session = useSession();
  const { add } = useCart();
  const favorites = useFavorites();
  const toast = useToast();

  const product = data?.products.find((p) => p.id === id) ?? null;
  const images = product?.images ?? [];

  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [qtyError, setQtyError] = useState('');
  const [tab, setTab] = useState<'desc' | 'shipping' | 'reviews'>('desc');

  // Image viewer state
  const [activeImage, setActiveImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Enquiry form state
  const [enquiryType, setEnquiryType] = useState<EnquiryType>('info');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState('');

  const goToImage = useCallback((delta: number) => {
    setActiveImage((current) => {
      if (images.length === 0) return 0;
      return (current + delta + images.length) % images.length;
    });
  }, [images.length]);

  const closeViewer = useCallback(() => setViewerOpen(false), []);

  // Keyboard support while the lightbox is open. In RTL, ArrowLeft moves to the
  // next image (visually left) and ArrowRight goes back.
  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeViewer();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToImage(1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToImage(-1);
      } else if (event.key === '+' || event.key === '=') {
        setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
      } else if (event.key === '-' || event.key === '_') {
        setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerOpen, goToImage, closeViewer]);

  // A route change to a different product should never leave a stale viewer open.
  useEffect(() => {
    setActiveImage(0);
    setViewerOpen(false);
    setScale(1);
    setRotation(0);
  }, [id]);

  if (!data) return null;
  if (!product) {
    return (
      <div className="container" style={{ padding: 40 }}>
        <EmptyState title="المنتج غير موجود" action={<Link to="/store" className="btn btn-primary">العودة للمتجر</Link>} />
      </div>
    );
  }
  // A product with no variants cannot be priced or ordered. Show a graceful
  // state instead of letting resolveUnitPrice()/activeVariant.stock throw.
  if (!product.variants || product.variants.length === 0) {
    return (
      <div className="container" style={{ padding: 40 }}>
        <EmptyState title="هذا المنتج غير متوفر حالياً" description="لا توجد خيارات متاحة لهذا المنتج. تصفّح منتجاتنا الأخرى." action={<Link to="/store" className="btn btn-primary">العودة للمتجر</Link>} />
      </div>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === variantId) || product.variants[0];
  const customer = session ? data.users.find((u) => u.id === session.userId) || null : null;
  const priceSource = resolveUnitPrice(data, activeVariant, product.id, qty, customer);
  const price = priceSource.unitPrice;
  const related = data.products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 5);
  const currentImage = images[Math.min(activeImage, Math.max(0, images.length - 1))] ?? '';
  const isFavorite = favorites.has(product.id);

  const openViewer = (index: number) => {
    setActiveImage(index);
    setScale(1);
    setRotation(0);
    setViewerOpen(true);
  };

  const shareProduct = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: product.nameAr, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.show('تم نسخ رابط المنتج', 'success');
      } else {
        toast.show('تعذر نسخ الرابط', 'error');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.show('تعذرت مشاركة الرابط', 'error');
    }
  };

  const toggleFavorite = () => {
    const nowFavorite = favorites.toggle(product.id);
    toast.show(nowFavorite ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة', 'success');
  };

  const submitEnquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = customerName.trim();
    const phone = customerPhone.trim();
    const text = message.trim();
    if (!name || !phone || !text) {
      toast.show('يرجى إدخال الاسم ورقم الهاتف والرسالة', 'error');
      return;
    }
    store.upsertEnquiry({
      id: 'q-' + Date.now(),
      productId: product.id,
      productNameAr: product.nameAr,
      customerId: session?.userId || null,
      customerName: name,
      customerPhone: phone,
      type: enquiryType,
      message: text,
      handled: false,
      createdAt: new Date().toISOString(),
    });
    toast.show('تم إرسال طلبك إلى فريق المبيعات', 'success');
    setCustomerName('');
    setCustomerPhone('');
    setMessage('');
    setEnquiryType('info');
  };

  const addToCart = () => {
    if (activeVariant.stock === 0) return;
    const check = checkQuantity(activeVariant, qty);
    if (!check.valid) { setQtyError(check.messageAr); toast.show(check.messageAr, 'error'); return; }
    setQtyError('');
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

      <div className="product-detail">
        {/* Images */}
        <div>
          <div className="card product-main-image">
            <button type="button" className="product-image-button" onClick={() => openViewer(activeImage)} aria-label="عرض الصورة بحجم كبير">
              <img src={currentImage} alt={product.nameAr} />
              <span className="product-image-zoom"><Maximize2 size={16} /> تكبير الصورة</span>
            </button>
          </div>
          {images.length > 1 && (
            <div className="product-thumbs">
              {images.map((im, i) => (
                <button
                  key={i}
                  type="button"
                  className={`product-thumb ${i === activeImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`عرض الصورة ${i + 1}`}
                  aria-pressed={i === activeImage}
                >
                  <img src={im} alt="" />
                </button>
              ))}
            </div>
          )}
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
                <button key={v.id} onClick={() => { setVariantId(v.id); setQty(Math.max(1, v.moq || 1)); setQtyError(''); }}
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
              <button className="btn-icon" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="تقليل الكمية"><Minus size={16} /></button>
              <span style={{ width: 36, textAlign: 'center', fontWeight: 800 }}>{qty}</span>
              <button className="btn-icon" onClick={() => setQty(Math.min(activeVariant.stock, qty + 1))} aria-label="زيادة الكمية"><Plus size={16} /></button>
            </div>
            {(activeVariant.moq > 1 || activeVariant.packSize > 1) && <span className="muted" style={{ fontSize: 11 }}>الحد الأدنى {activeVariant.moq} · العبوة {activeVariant.packSize} وحدة</span>}
          </div>
          {qtyError && <div className="text-danger" style={{ fontSize: 12, marginTop: -12, marginBottom: 14 }}>{qtyError}</div>}
          {priceSource.source !== 'base' && <div className="row" style={{ gap: 5, fontSize: 11, color: 'var(--plum-600)', marginBottom: 12 }}><Tag size={12} /> {priceSource.tierLabel}</div>}

          <div className="row" style={{ gap: 10, marginBottom: 24 }}>
            <button className="btn btn-primary btn-lg grow" onClick={addToCart} disabled={activeVariant.stock === 0}>
              <ShoppingBag size={19} /> {activeVariant.stock === 0 ? 'غير متوفر' : 'أضف إلى السلة'}
            </button>
            <button
              className={`btn btn-outline btn-lg favorite-btn ${isFavorite ? 'active' : ''}`}
              onClick={toggleFavorite}
              title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              aria-pressed={isFavorite}
            >
              <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => void shareProduct()}
              title="مشاركة المنتج"
              aria-label="مشاركة المنتج"
            >
              <Share2 size={20} />
            </button>
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

      {/* Request information / feedback */}
      <section className="card enquiry-card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <MessageSquareText size={22} color="var(--plum-700)" />
          <h2 style={{ fontSize: 20 }}>اطلب معلومات أو أرسل ملاحظة</h2>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
          يرسل هذا النموذج طلبك مباشرة إلى فريق المبيعات لمراجعته والرد عليه.
        </p>
        <form className="enquiry-form" onSubmit={submitEnquiry}>
          <div className="field">
            <label htmlFor="enquiry-type">نوع الطلب</label>
            <select id="enquiry-type" className="select" value={enquiryType} onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}>
              <option value="info">طلب معلومات</option>
              <option value="feedback">ملاحظة</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="enquiry-name">الاسم</label>
            <input id="enquiry-name" className="input" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="الاسم الكامل" required />
          </div>
          <div className="field">
            <label htmlFor="enquiry-phone">رقم الهاتف</label>
            <input id="enquiry-phone" className="input" type="tel" inputMode="tel" dir="ltr" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="رقم التواصل" required />
          </div>
          <div className="field enquiry-message">
            <label htmlFor="enquiry-message">الرسالة</label>
            <textarea id="enquiry-message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب تفاصيل طلبك أو ملاحظتك" required />
          </div>
          <div className="enquiry-submit">
            <button type="submit" className="btn btn-primary btn-lg"><Send size={18} /> إرسال الطلب</button>
          </div>
        </form>
      </section>

      {related.length > 0 && (
        <section style={{ marginTop: 50 }}>
          <h2 className="section-title" style={{ marginBottom: 20, fontSize: 24 }}>قد يعجبك أيضاً</h2>
          <div className="products-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* Fullscreen image viewer */}
      {viewerOpen && images.length > 0 && (
        <div
          className="image-viewer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`عارض صور ${product.nameAr}`}
          onClick={closeViewer}
        >
          <div className="viewer-toolbar" onClick={(e) => e.stopPropagation()}>
            <span className="viewer-title">{product.nameAr} <span className="viewer-count">({activeImage + 1} / {images.length})</span></span>
            <div className="viewer-actions">
              <button type="button" className="viewer-btn" onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))} title="تصغير" aria-label="تصغير"><ZoomOut size={22} /></button>
              <button type="button" className="viewer-btn" onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))} title="تكبير" aria-label="تكبير"><ZoomIn size={22} /></button>
              <button type="button" className="viewer-btn" onClick={() => setRotation((r) => r - 90)} title="تدوير لليسار" aria-label="تدوير لليسار"><RotateCcw size={22} /></button>
              <button type="button" className="viewer-btn" onClick={() => setRotation((r) => r + 90)} title="تدوير لليمين" aria-label="تدوير لليمين"><RotateCw size={22} /></button>
              <button type="button" className="viewer-btn" onClick={shareProduct} title="مشاركة" aria-label="مشاركة"><Share2 size={22} /></button>
              <button type="button" className="viewer-btn close" onClick={closeViewer} title="إغلاق" aria-label="إغلاق"><X size={24} /></button>
            </div>
          </div>

          <div className="image-viewer-stage" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button type="button" className="viewer-nav prev" onClick={() => goToImage(-1)} title="الصورة السابقة" aria-label="الصورة السابقة"><ChevronRight size={28} /></button>
            )}
            <img className="image-viewer-img" src={currentImage} alt={product.nameAr} style={{ transform: `rotate(${rotation}deg) scale(${scale})` }} />
            {images.length > 1 && (
              <button type="button" className="viewer-nav next" onClick={() => goToImage(1)} title="الصورة التالية" aria-label="الصورة التالية"><ChevronLeft size={28} /></button>
            )}
          </div>

          {images.length > 1 && (
            <div className="viewer-thumbs" onClick={(e) => e.stopPropagation()}>
              {images.map((im, i) => (
                <button
                  key={i}
                  type="button"
                  className={`viewer-thumb ${i === activeImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`عرض الصورة ${i + 1}`}
                  aria-pressed={i === activeImage}
                >
                  <img src={im} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
