import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowLeft, Sparkles, Grid2X2, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useData, topCategories, childCategoriesOf } from '@/data/store';

const iconFor = (name: string) =>
  (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] || Icons.Sparkles;

/** Desktop hover mega menu + mobile accordion. Only top-level categories
 *  appear in the bar; subcategories are revealed inside the panel. */
export function MegaMenu() {
  const data = useData();
  const [active, setActive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCat, setMobileCat] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  if (!data) return null;
  const tops = topCategories(data);

  const open = (id: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setActive(id);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setActive(null), 140);
  };

  const panelFor = (catId: string) => {
    const cat = data.categories.find((c) => c.id === catId)!;
    const subs = childCategoriesOf(data, catId);
    const products = data.products.filter((p) => p.isActive && (
      subs.length ? subs.some((s) => s.id === p.categoryId) : p.categoryId === catId
    )).slice(0, 4);
    const Icon = iconFor(cat.icon);
    return (
      <div className="mega-panel" onMouseEnter={() => open(catId)} onMouseLeave={scheduleClose}>
        <div className="mega-main">
          <Link to={`/store/category/${cat.id}`} className="mega-head" onClick={() => { setActive(null); setMobileOpen(false); }}>
            <span className="mega-head-icon" style={{ background: cat.color }}><Icon size={20} /></span>
            <span>
              <strong>{cat.nameAr}</strong>
              <small>{cat.descriptionAr}</small>
            </span>
          </Link>
          {subs.length > 0 && (
            <div className="mega-subs">
              <div className="mega-label">الأقسام</div>
              {subs.map((s) => (
                <Link key={s.id} to={`/store/category/${s.id}`} onClick={() => { setActive(null); setMobileOpen(false); }}>
                  <span className="mega-dot" style={{ background: s.color }} />
                  {s.nameAr}
                  <ArrowLeft size={13} className="mega-arrow" />
                </Link>
              ))}
            </div>
          )}
        </div>
        {products.length > 0 && (
          <div className="mega-featured">
            <div className="mega-label">الأكثر طلباً</div>
            <div className="mega-products">
              {products.map((p) => (
                <Link key={p.id} to={`/store/product/${p.id}`} className="mega-product" onClick={() => { setActive(null); setMobileOpen(false); }}>
                  <img src={p.images[0]} alt="" />
                  <span>{p.nameAr}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop bar */}
      <nav className="container mega-bar" onMouseLeave={scheduleClose}>
        <NavLinkLike to="/store" label="الرئيسية" />
        <NavLinkLike to="/store/categories" label="كل المنتجات" />
        {tops.map((c) => (
          <div key={c.id} className="mega-item" onMouseEnter={() => open(c.id)}>
            <Link to={`/store/category/${c.id}`} className={`mega-trigger ${active === c.id ? 'is-active' : ''}`}>
              {c.nameAr}
              {childCategoriesOf(data, c.id).length > 0 && <ChevronDown size={13} />}
            </Link>
            {active === c.id && panelFor(c.id)}
          </div>
        ))}
        <Link to="/store/offers" className="mega-trigger mega-offer"><Sparkles size={13} /> العروض</Link>
      </nav>

      {/* Mobile category button + sheet */}
      <button type="button" className="mega-mobile-btn" onClick={() => setMobileOpen(true)}>
        <Grid2X2 size={16} /> تصفّح الفئات <ChevronDown size={14} />
      </button>
      {mobileOpen && (
        <div className="mega-sheet-backdrop" onClick={() => setMobileOpen(false)}>
          <div className="mega-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mega-sheet-head">
              <strong>تصفّح الفئات</strong>
              <button className="btn-icon" aria-label="إغلاق" onClick={() => setMobileOpen(false)}><X size={20} /></button>
            </div>
            <div className="mega-sheet-body">
              <Link to="/store/categories" className="mega-sheet-all" onClick={() => setMobileOpen(false)}><Grid2X2 size={17} /> كل المنتجات</Link>
              {tops.map((c) => {
                const subs = childCategoriesOf(data, c.id);
                const Icon = iconFor(c.icon);
                return (
                  <div key={c.id} className="mega-acc">
                    <div className="mega-acc-row">
                      <Link to={`/store/category/${c.id}`} onClick={() => setMobileOpen(false)} className="mega-acc-main">
                        <span className="mega-head-icon" style={{ background: c.color }}><Icon size={17} /></span>
                        {c.nameAr}
                      </Link>
                      {subs.length > 0 && (
                        <button className="btn-icon" aria-label="عرض الأقسام" onClick={() => setMobileCat(mobileCat === c.id ? null : c.id)}>
                          <ChevronDown size={18} style={{ transform: mobileCat === c.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                        </button>
                      )}
                    </div>
                    {mobileCat === c.id && subs.length > 0 && (
                      <div className="mega-acc-subs">
                        {subs.map((s) => (
                          <Link key={s.id} to={`/store/category/${s.id}`} onClick={() => setMobileOpen(false)}>
                            <span className="mega-dot" style={{ background: s.color }} />{s.nameAr}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Link to="/store/offers" className="mega-sheet-all" onClick={() => setMobileOpen(false)}><Sparkles size={17} /> العروض</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLinkLike({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="mega-trigger">{label}</Link>;
}
