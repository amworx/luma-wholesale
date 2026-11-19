import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpLeft, Sparkles, Truck, BadgeCheck, Star } from 'lucide-react';
import { useData, formatMoney } from '@/data/store';
import { mostSold } from '@/data/recommendations';
import { resolveUnitPrice } from '@/data/pricing';

/**
 * Storefront hero — Editorial Luxe (selected design).
 *
 * Fully data-driven: the featured product, its image, category, name and
 * starting wholesale price all come from the live store data. The product is
 * the current best-seller (mostSold), so when order history changes the hero
 * updates on the next render with no manual editing. With no sales history it
 * falls back to a top-rated featured product via the same recommendation rule.
 *
 * RTL-first, built from the app's existing CSS tokens. No external deps.
 */
export function Hero() {
  const data = useData();
  if (!data) return null;

  const top = mostSold(data, 1)[0];
  // Graceful fallback if the catalogue is empty (e.g. a fresh install).
  if (!top) return null;

  const category = data.categories.find((c) => c.id === top.categoryId);
  const image = top.images[0];
  // "Starting from" price: the lowest effective wholesale unit price across
  // active variants at their minimum order quantity, for a guest buyer.
  const prices = top.variants
    .filter((v) => v.stock > 0)
    .map((v) => resolveUnitPrice(data, v, top.id, Math.max(1, v.moq), null).unitPrice);
  const startingPrice = prices.length ? Math.min(...prices) : null;

  return (
    <div className="hv-wrap">
      <section className="hv hv-editorial" aria-label="واجهة المتجر">
        <div className="hv-e-glow" />
        <div className="hv-inner hv-e-grid">
          <div className="hv-e-copy">
            <span className="hv-eyebrow hv-e-eyebrow"><span className="hv-e-line" /> متجر الجملة لمستحضرات التجميل</span>
            <h1 className="hv-e-title">جمالٌ يُباع<span className="hv-e-accent"> بالجملة</span></h1>
            <p className="hv-e-sub">تشكيلة مختارة بعناية من مستحضرات التجميل والعناية، بأسعار جملة تناسب متجرك أو مركزك. اطلب الكمية التي تحتاجها واترك الباقي لفريقنا.</p>
            <div className="hv-actions">
              <Link to="/store/categories" className="hv-btn hv-btn-primary">تصفّح المنتجات <ArrowLeft size={17} /></Link>
              <Link to="/store/bulk-order" className="hv-btn hv-btn-ghost">طلب بالجملة <ArrowUpLeft size={15} /></Link>
            </div>
            <div className="hv-e-trust">
              <span><BadgeCheck size={16} /> منتجات أصلية</span>
              <span><Truck size={16} /> شحن لكل المحافظات</span>
              <span><Star size={16} fill="currentColor" /> تقييم 4.8/5</span>
            </div>
          </div>
          <div className="hv-e-visual">
            <Link to={`/store/product/${top.id}`} className="hv-e-visual-link" aria-label={top.nameAr}>
              <div className="hv-e-circle" />
              <div className="hv-e-card">
                <img src={image} alt={top.nameAr} />
              </div>
            </Link>
            <Link to={`/store/product/${top.id}`} className="hv-e-float">
              <span className="hv-e-float-icon"><Sparkles size={16} /></span>
              <span><strong>الأكثر مبيعاً{category ? ` · ${category.nameAr}` : ''}</strong><small>{top.nameAr}</small></span>
            </Link>
            {startingPrice !== null && (
              <div className="hv-e-price">
                <small>يبدأ من</small><strong>{formatMoney(startingPrice)}</strong>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
