import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpLeft, Sparkles, Truck, BadgeCheck, Star } from 'lucide-react';
import { assetUrl } from '@/data/store';

/**
 * Three modern, RTL-first hero concepts for the wholesale store.
 * A small preview switcher lets the client compare them live; the choice is
 * remembered in localStorage so it survives reloads. Once a design is picked,
 * HeroShowcase's default can be set to that variant and the switcher removed.
 *
 * All visuals use the app's existing product SVGs and CSS tokens — no new
 * dependencies, no Tailwind, no external images.
 */

const CHOICE_KEY = 'luma.hero.choice';
type Choice = 1 | 2 | 3;

const CTA = ({ gold = false }: { gold?: boolean }) => (
  <div className="hv-actions">
    <Link to="/store/categories" className={gold ? 'hv-btn hv-btn-gold' : 'hv-btn hv-btn-primary'}>
      تصفّح المنتجات <ArrowLeft size={17} />
    </Link>
    <Link to="/store/bulk-order" className="hv-btn hv-btn-ghost">طلب بالجملة <ArrowUpLeft size={15} /></Link>
  </div>
);

/* ------------------------------------------------------------------ */
/* 1 — Editorial Luxe: warm, fashion-magazine layout                    */
/* ------------------------------------------------------------------ */
function HeroEditorial() {
  return (
    <section className="hv hv-editorial" aria-label="واجهة المتجر">
      <div className="hv-e-glow" />
      <div className="hv-inner hv-e-grid">
        <div className="hv-e-copy">
          <span className="hv-eyebrow hv-e-eyebrow"><span className="hv-e-line" /> متجر الجملة لمستحضرات التجميل</span>
          <h1 className="hv-e-title">جمالٌ يُباع<span className="hv-e-accent"> بالجملة</span></h1>
          <p className="hv-e-sub">تشكيلة مختارة بعناية من مستحضرات التجميل والعناية، بأسعار جملة تناسب متجرك أو مركزك. اطلب الكمية التي تحتاجها واترك الباقي لفريقنا.</p>
          <CTA />
          <div className="hv-e-trust">
            <span><BadgeCheck size={16} /> منتجات أصلية</span>
            <span><Truck size={16} /> شحن لكل المحافظات</span>
            <span><Star size={16} fill="currentColor" /> تقييم 4.8/5</span>
          </div>
        </div>
        <div className="hv-e-visual">
          <div className="hv-e-circle" />
          <div className="hv-e-card">
            <img src={assetUrl('images/lipstick-velvet.svg')} alt="أحمر شفاه لُما" />
          </div>
          <div className="hv-e-float">
            <span className="hv-e-float-icon"><Sparkles size={16} /></span>
            <span><strong>الأكثر مبيعاً</strong><small>أحمر الشفاه المخملي</small></span>
          </div>
          <div className="hv-e-price">
            <small>يبدأ من</small><strong>$7.50</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — Cinematic Glass: dark, immersive, frosted panel                  */
/* ------------------------------------------------------------------ */
function HeroCinematic() {
  return (
    <section className="hv hv-cinematic" aria-label="واجهة المتجر">
      <div className="hv-c-orb hv-c-orb-a" />
      <div className="hv-c-orb hv-c-orb-b" />
      <img className="hv-c-bg" src={assetUrl('images/perfume-amber.svg')} alt="" />
      <div className="hv-inner hv-c-grid">
        <div className="hv-c-glass">
          <span className="hv-eyebrow hv-c-eyebrow"><Sparkles size={13} /> لمسة لُما · تشكيلة الجملة</span>
          <h1 className="hv-c-title">أسعار الجملة<span className="hv-c-accent"> بلمسة فاخرة</span></h1>
          <p className="hv-c-sub">من أحمر الشفاه إلى العطور الفاخرة، كل ما يحتاجه متجرك في مكان واحد — بأسعار جملة وخدمة مبيعات تتابع طلبك خطوة بخطوة.</p>
          <CTA gold />
          <div className="hv-c-stats">
            <div><strong>+١٢٠</strong><span>منتجاً</span></div>
            <div><strong>٤.٨</strong><span>تقييم التجار</span></div>
            <div><strong>١٠٠٪</strong><span>منتجات أصلية</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3 — Bold Minimal: clean, Swiss-inspired, typographic                */
/* ------------------------------------------------------------------ */
function HeroMinimal() {
  return (
    <section className="hv hv-minimal" aria-label="واجهة المتجر">
      <div className="hv-inner hv-m-grid">
        <div className="hv-m-copy">
          <span className="hv-eyebrow hv-m-eyebrow">٠١ / متجر الجملة</span>
          <h1 className="hv-m-title">كل ما يحتاجه<span> متجرك</span>،<br />في طلب واحد.</h1>
          <p className="hv-m-sub">تصفّح آلاف المنتجات، اختر كمياتك، وأرسل طلبك — فريق المبيعات يتولّى الباقي.</p>
          <CTA />
          <div className="hv-m-features">
            <div><span>٠١</span><strong>أسعار جملة</strong><small>خصومات على الكميات</small></div>
            <div><span>٠٢</span><strong>شحن سريع</strong><small>لكل المحافظات</small></div>
            <div><span>٠٣</span><strong>دعم مباشر</strong><small>مندوب يتابع طلبك</small></div>
          </div>
        </div>
        <div className="hv-m-visual">
          <div className="hv-m-block" />
          <div className="hv-m-disc" />
          <img src={assetUrl('images/serum-glow.svg')} alt="سيروم لُما" />
          <span className="hv-m-tag">جديد</span>
        </div>
      </div>
      <div className="hv-m-ticker" aria-hidden="true">
        <div className="hv-m-track">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i}>أسعار الجملة <b>✦</b> منتجات أصلية <b>✦</b> شحن لكل المحافظات <b>✦</b> دعم المبيعات <b>✦</b></span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Preview switcher                                                     */
/* ------------------------------------------------------------------ */
export function HeroShowcase() {
  const [choice, setChoice] = useState<Choice>(() => {
    try {
      const v = Number(localStorage.getItem(CHOICE_KEY));
      return v === 1 || v === 2 || v === 3 ? v : 1;
    } catch { return 1; }
  });

  useEffect(() => {
    try { localStorage.setItem(CHOICE_KEY, String(choice)); } catch { /* ignore */ }
  }, [choice]);

  return (
    <div className="hv-showcase">
      <div className="hv-switch" role="group" aria-label="اختر تصميم الواجهة">
        <span className="hv-switch-label">معاينة التصاميم</span>
        <div className="hv-switch-btns">
          {([1, 2, 3] as Choice[]).map((n) => (
            <button key={n} className={choice === n ? 'is-active' : ''} onClick={() => setChoice(n)} aria-pressed={choice === n}>
              تصميم {n === 1 ? '١' : n === 2 ? '٢' : '٣'}
            </button>
          ))}
        </div>
      </div>
      {choice === 1 && <HeroEditorial />}
      {choice === 2 && <HeroCinematic />}
      {choice === 3 && <HeroMinimal />}
    </div>
  );
}
