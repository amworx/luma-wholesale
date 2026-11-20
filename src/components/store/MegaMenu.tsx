import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ArrowLeft, Sparkles, Grid2X2, X, Home, Layers } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useData, topCategories, childCategoriesOf } from '@/data/store';
import type { AppData, Category } from '@/types';

const iconFor = (name: string) =>
  (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] || Icons.Sparkles;

/** Every descendant of a category, flattened depth-first with its level. */
function descendants(data: AppData, rootId: string): { cat: Category; level: number }[] {
  const out: { cat: Category; level: number }[] = [];
  const walk = (id: string, level: number) => {
    for (const child of childCategoriesOf(data, id)) {
      out.push({ cat: child, level });
      walk(child.id, level + 1);
    }
  };
  walk(rootId, 1);
  return out;
}

/** Desktop hover mega menu + mobile drill-down sheet. Walks the full
 *  category tree, so subcategories of subcategories are navigable. */
export function MegaMenu() {
  const data = useData();
  const location = useLocation();
  const [active, setActive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [path, setPath] = useState<Category[]>([]);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);
  // Close the mobile sheet whenever navigation happens.
  useEffect(() => { setMobileOpen(false); setPath([]); }, [location.pathname]);

  if (!data) return null;
  const tops = topCategories(data);

  const open = (id: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setActive(id);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setActive(null), 150);
  };
  const closeAll = () => { setActive(null); setMobileOpen(false); setPath([]); };

  const panelFor = (catId: string) => {
    const cat = data.categories.find((c) => c.id === catId);
    if (!cat) return null;
    const all = descendants(data, catId);    // Products anywhere in this branch (not just direct children).
    const branchIds = new Set([catId, ...all.map((d) => d.cat.id)]);
    const products = data.products
      .filter((p) => p.isActive && branchIds.has(p.categoryId))
      .slice(0, 4);
    const Icon = iconFor(cat.icon);

    return (
      <div className="mm-panel" onMouseEnter={() => open(catId)} onMouseLeave={scheduleClose}>
        <div className="mm-panel-cols">
          <Link to={`/store/category/${cat.id}`} className="mm-head" onClick={closeAll}>
            <span className="mm-head-icon" style={{ background: cat.color }}><Icon size={20} /></span>
            <span className="mm-head-text">
              <strong>{cat.nameAr}</strong>
              <small>{cat.descriptionAr || 'عرض كل المنتجات'}</small>
            </span>
            <ArrowLeft size={15} className="mm-head-arrow" />
          </Link>

          {all.length > 0 && (
            <div className="mm-tree">
              <div className="mm-label">الأقسام</div>
              {all.map(({ cat: sub, level }) => (
                <Link
                  key={sub.id}
                  to={`/store/category/${sub.id}`}
                  onClick={closeAll}
                  className={`mm-node level-${Math.min(level, 3)}`}
                  style={{ paddingInlineStart: 10 + (level - 1) * 14 }}
                >
                  <span className="mm-dot" style={{ background: sub.color }} />
                  <span className="mm-node-name">{sub.nameAr}</span>
                  {level > 1 && <span className="mm-depth">{level}</span>}
                  <ArrowLeft size={12} className="mm-arrow" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="mm-featured">
            <div className="mm-label">الأكثر طلباً</div>
            <div className="mm-products">
              {products.map((p) => (
                <Link key={p.id} to={`/store/product/${p.id}`} className="mm-product" onClick={closeAll}>
                  <img src={p.images[0]} alt="" />
                  <span>{p.nameAr}</span>
                </Link>
              ))}
            </div>
            <Link to={`/store/category/${cat.id}`} className="mm-see-all" onClick={closeAll}>
              كل منتجات {cat.nameAr} <ArrowLeft size={13} />
            </Link>
          </div>
        )}
      </div>
    );
  };

  // ---- Mobile drill-down ----
  const current = path[path.length - 1] || null;
  const mobileChildren = current ? childCategoriesOf(data, current.id) : tops;

  return (
    <>
      {/* Desktop bar */}
      <nav className="container mm-bar" onMouseLeave={scheduleClose}>
        <Link to="/store" className="mm-trigger mm-home"><Home size={15} /> الرئيسية</Link>
        <Link to="/store/categories" className="mm-trigger">كل المنتجات</Link>
        <span className="mm-divider" />
        {tops.map((c) => {
          const hasKids = childCategoriesOf(data, c.id).length > 0;
          return (
            <div key={c.id} className="mm-item" onMouseEnter={() => open(c.id)}>
              <Link to={`/store/category/${c.id}`} className={`mm-trigger ${active === c.id ? 'is-active' : ''}`}>
                {c.nameAr}
                {hasKids && <ChevronDown size={13} className="mm-chev" />}
              </Link>
            </div>
          );
        })}
        <Link to="/store/offers" className="mm-trigger mm-offer"><Sparkles size={13} /> العروض</Link>
        {/* Single panel anchored to the bar so it never clips off-screen in RTL. */}
        {active && panelFor(active)}
      </nav>

      {/* Mobile trigger */}
      <button type="button" className="mm-mobile-btn" onClick={() => setMobileOpen(true)}>
        <Layers size={16} /> تصفّح الفئات <ChevronDown size={14} />
      </button>

      {mobileOpen && (
        <div className="mm-sheet-backdrop" onClick={() => setMobileOpen(false)}>
          <div className="mm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mm-sheet-head">
              {current ? (
                <button className="mm-back" onClick={() => setPath((p) => p.slice(0, -1))}>
                  <ArrowLeft size={17} style={{ transform: 'rotate(180deg)' }} /> رجوع
                </button>
              ) : (
                <strong>تصفّح الفئات</strong>
              )}
              <button className="modal-close" aria-label="إغلاق" onClick={() => setMobileOpen(false)}><X size={18} /></button>
            </div>

            {current && (
              <Link to={`/store/category/${current.id}`} className="mm-sheet-current" onClick={closeAll}>
                <span className="mm-head-icon" style={{ background: current.color }}>{(() => { const I = iconFor(current.icon); return <I size={17} />; })()}</span>
                <span>
                  <strong>{current.nameAr}</strong>
                  <small>عرض كل المنتجات</small>
                </span>
                <ArrowLeft size={15} />
              </Link>
            )}

            <div className="mm-sheet-body">
              {!current && (
                <Link to="/store/categories" className="mm-sheet-all" onClick={closeAll}><Grid2X2 size={17} /> كل المنتجات</Link>
              )}
              {mobileChildren.map((c) => {
                const kids = childCategoriesOf(data, c.id);
                const Icon = iconFor(c.icon);
                return kids.length > 0 ? (
                  <button key={c.id} className="mm-sheet-row" onClick={() => setPath((p) => [...p, c])}>
                    <span className="mm-head-icon" style={{ background: c.color }}><Icon size={17} /></span>
                    <span className="grow" style={{ textAlign: 'right' }}>
                      <strong>{c.nameAr}</strong>
                      <small>{kids.length} قسم فرعي</small>
                    </span>
                    <ChevronDown size={17} style={{ transform: 'rotate(90deg)', opacity: .5 }} />
                  </button>
                ) : (
                  <Link key={c.id} to={`/store/category/${c.id}`} className="mm-sheet-row" onClick={closeAll}>
                    <span className="mm-head-icon" style={{ background: c.color }}><Icon size={17} /></span>
                    <span className="grow" style={{ textAlign: 'right' }}><strong>{c.nameAr}</strong></span>
                    <ArrowLeft size={15} style={{ opacity: .5 }} />
                  </Link>
                );
              })}
              {!current && (
                <Link to="/store/offers" className="mm-sheet-all" onClick={closeAll}><Sparkles size={17} /> العروض والخصومات</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
