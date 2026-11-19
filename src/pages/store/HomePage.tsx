import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Truck, ShieldCheck, RotateCcw, Star } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useData, formatMoney } from '@/data/store';
import { ProductCard } from '@/components/store/ProductCard';
import { ElasticGallery } from '@/components/store/ElasticGallery';

export function HomePage() {
  const data = useData();
  if (!data) return null;
  const featured = data.products.filter((p) => p.isActive && p.isFeatured);
  const newArrivals = data.products.filter((p) => p.isActive && p.isNew);
  const offers = data.products.filter((p) => p.isActive && p.variants.some((v) => v.salePrice !== null));

  return (
    <div>
      {/* Hero: copy + elastic product gallery */}
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="hero hero-elastic">
          <div className="container hero-inner" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 30, alignItems: 'center', position: 'relative', zIndex: 2 }}>
            <div style={{ padding: '40px 0' }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', marginBottom: 18 }}>
                <Sparkles size={14} /> متجر الجملة الأول لمستحضرات التجميل
              </span>
              <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.2, marginBottom: 16 }}>
                مستحضرات تجميل،<br /><span style={{ color: 'var(--gold-300)' }}>بأسعار الجملة</span>
              </h1>
              <p style={{ fontSize: 16, opacity: .9, maxWidth: 440, marginBottom: 26, lineHeight: 1.9 }}>
                تصفّح تشكيلة واسعة من مستحضرات التجميل والعناية بالبشرة بأسعار الجملة، واختر الكميات التي تناسب متجرك أو مركزك.
              </p>
              <div className="row wrap" style={{ gap: 12 }}>
                <Link to="/store/categories" className="btn btn-gold btn-lg">تصفّح المنتجات <ArrowLeft size={18} /></Link>
                <Link to="/store/offers" className="btn btn-lg" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}>العروض</Link>
              </div>
              <div className="row" style={{ gap: 22, marginTop: 30, flexWrap: 'wrap', opacity: .85, fontSize: 12 }}>
                <span className="row" style={{ gap: 6 }}><Star size={15} fill="var(--gold-300)" color="var(--gold-300)" /> تقييم 4.8/5</span>
                <span className="row" style={{ gap: 6 }}><Truck size={15} /> شحن لكل المحافظات</span>
                <span className="row" style={{ gap: 6 }}><ShieldCheck size={15} /> منتجات أصلية</span>
              </div>
            </div>
            <div className="hero-art">
              <ElasticGallery />
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="container" style={{ marginTop: 22 }}>
        <div className="card trust-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '18px 10px' }}>
          {[
            { icon: <Truck size={22} />, t: 'شحن مجاني', s: `للطلبات فوق ${formatMoney(data.settings.freeShippingOver)}` },
            { icon: <ShieldCheck size={22} />, t: 'منتجات أصلية', s: 'جودة مضمونة 100%' },
            { icon: <RotateCcw size={22} />, t: 'أسعار الجملة', s: 'خصومات على الكميات' },
            { icon: <Sparkles size={22} />, t: 'دعم المبيعات', s: 'تواصل مباشر مع المندوب' },
          ].map((x) => (
            <div key={x.t} className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderLeft: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--plum-600)' }}>{x.icon}</span>
              <strong style={{ fontSize: 13 }}>{x.t}</strong>
              <span className="muted" style={{ fontSize: 11 }}>{x.s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="container" style={{ marginTop: 54 }}>
        <div className="row-between" style={{ marginBottom: 20 }}>
          <div><span className="eyebrow">تصفّح حسب</span><h2 className="section-title">فئاتنا</h2></div>
          <Link to="/store/categories" className="btn btn-ghost btn-sm">عرض الكل <ArrowLeft size={15} /></Link>
        </div>
        <div className="grid-3">
          {data.categories.filter((c) => c.active).map((c) => {
            const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[c.icon] || Icons.Sparkles;
            return (
              <Link key={c.id} to={`/store/category/${c.id}`} className="cat-tile" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <IconComp size={30} />
                  <h3 style={{ fontSize: 19, marginTop: 12 }}>{c.nameAr}</h3>
                  <p style={{ fontSize: 12, opacity: .85, marginTop: 3 }}>{c.descriptionAr}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="container" style={{ marginTop: 54 }}>
        <div className="row-between" style={{ marginBottom: 20 }}>
          <div><span className="eyebrow">الأكثر طلباً</span><h2 className="section-title">الأكثر مبيعاً</h2></div>
          <Link to="/store/categories" className="btn btn-ghost btn-sm">عرض الكل <ArrowLeft size={15} /></Link>
        </div>
        <div className="products-grid">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Promo banner */}
      <section className="container" style={{ marginTop: 56 }}>
        <div style={{ background: 'linear-gradient(120deg, var(--gold-500), #e3c377)', borderRadius: 'var(--r-xl)', padding: '38px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', color: '#3d2a08' }}>
          <div>
            <span className="eyebrow" style={{ color: '#7a5a12' }}>عرض خاص لفترة محدودة</span>
            <h2 style={{ fontSize: 28, margin: '6px 0' }}>خصم يصل إلى 30% على العطور</h2>
            <p style={{ fontSize: 14, opacity: .8 }}>تصفّح تشكيلة العطور الفاخرة بأسعار الجملة.</p>
          </div>
          <Link to="/store/category/c-fragrance" className="btn btn-primary btn-lg">تصفّح العطور <ArrowLeft size={18} /></Link>
        </div>
      </section>

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="container" style={{ marginTop: 54 }}>
          <div className="row-between" style={{ marginBottom: 20 }}>
            <div><span className="eyebrow">وصل حديثاً</span><h2 className="section-title">جديد لُما</h2></div>
          </div>
          <div className="products-grid">{newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <section className="container" style={{ marginTop: 54 }}>
          <div className="row-between" style={{ marginBottom: 20 }}>
            <div><span className="eyebrow" style={{ color: 'var(--danger)' }}>أسعار أقل</span><h2 className="section-title">عروض وخصومات</h2></div>
            <Link to="/store/offers" className="btn btn-ghost btn-sm">كل العروض <ArrowLeft size={15} /></Link>
          </div>
          <div className="products-grid">{offers.slice(0, 5).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
