import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutGrid, ShoppingBag, Heart, User, Settings, LayoutDashboard,
  LogIn, LogOut, Zap, Package, Sparkles, ChevronLeft,
} from 'lucide-react';
import { useData, useSession, topCategories, formatMoney, store } from '@/data/store';
import { useCart } from '@/state/CartContext';

/**
 * Floating bottom dock for phones.
 *
 * Collapsed: five icons in a pill. Tap one and a tray grows above the dock
 * with that section's own contents, so the dock is a small app shell rather
 * than a row of links. Tap the same icon, tap outside, or press Escape to
 * tuck it back down.
 *
 * Written RTL-first with logical properties (inset-inline-*) so the sliding
 * indicator and tray alignment work in Arabic without mirroring hacks.
 */

type TabId = 'home' | 'browse' | 'cart' | 'favorites' | 'account';

const TABS: { id: TabId; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'الرئيسية', Icon: Home },
  { id: 'browse', label: 'الفئات', Icon: LayoutGrid },
  { id: 'cart', label: 'السلة', Icon: ShoppingBag },
  { id: 'favorites', label: 'المفضلة', Icon: Heart },
  { id: 'account', label: 'حسابي', Icon: User },
];

export function BottomDock() {
  const data = useData();
  const session = useSession();
  const { priced, count, subtotal } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState<TabId | null>(null);
  const [trayH, setTrayH] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const favCount = data?.favoriteIds?.length ?? 0;
  const path = location.pathname;

  // Which tab the current route belongs to (drives the sliding indicator).
  const activeTab: TabId =
    path === '/store' || path === '/store/'
      ? 'home'
      : path.startsWith('/store/cart') || path.startsWith('/store/checkout')
        ? 'cart'
        : path.startsWith('/store/favorites')
          ? 'favorites'
          : path.startsWith('/store/account')
            ? 'account'
            : path.startsWith('/store/categories') ||
                path.startsWith('/store/category') ||
                path.startsWith('/store/product') ||
                path.startsWith('/store/search') ||
                path.startsWith('/store/offers') ||
                path.startsWith('/store/bulk-order')
              ? 'browse'
              : 'home';

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  // Measure the tray so it grows to its real height instead of a guessed
  // max-height, which would make the motion feel uneven across tabs.
  useLayoutEffect(() => {
    if (!open) { setTrayH(0); return; }
    const el = trayRef.current;
    if (!el) return;
    const measure = () => setTrayH(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, activeTab, data, count, subtotal]);

  // Route change tucks the dock away.
  useEffect(() => { setOpen(null); }, [path]);

  // Tap outside or Escape closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to: string) => { setOpen(null); navigate(to); };

  const topCats = data ? topCategories(data).slice(0, 6) : [];

  const tray = () => {
    if (!open) return null;

    if (open === 'home') {
      return (
        <div className="dock-tray-inner">
          <div className="dock-tray-head">
            <span className="dock-tray-title"><Sparkles size={15} /> تنقّل سريع</span>
          </div>
          <div className="dock-grid">
            <button className="dock-tile" onClick={() => go('/store/offers')}>
              <span className="dock-tile-ico is-gold"><Zap size={18} /></span>
              <span>العروض</span>
            </button>
            <button className="dock-tile" onClick={() => go('/store/categories')}>
              <span className="dock-tile-ico"><Package size={18} /></span>
              <span>كل المنتجات</span>
            </button>
            <button className="dock-tile" onClick={() => go('/store/bulk-order')}>
              <span className="dock-tile-ico is-plum"><Zap size={18} /></span>
              <span>طلب سريع</span>
            </button>
          </div>
        </div>
      );
    }

    if (open === 'browse') {
      return (
        <div className="dock-tray-inner">
          <div className="dock-tray-head">
            <span className="dock-tray-title"><LayoutGrid size={15} /> الفئات</span>
            <button className="dock-tray-all" onClick={() => go('/store/categories')}>
              عرض الكل <ChevronLeft size={14} />
            </button>
          </div>
          <div className="dock-cats">
            {topCats.map((c) => (
              <button key={c.id} className="dock-cat" onClick={() => go(`/store/category/${c.id}`)}>
                <span className="dock-cat-dot" style={{ background: c.color || 'var(--plum-500)' }} />
                <span className="dock-cat-name">{c.nameAr}</span>
                <ChevronLeft size={14} className="dock-cat-arrow" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (open === 'cart') {
      if (priced.length === 0) {
        return (
          <div className="dock-tray-inner">
            <div className="dock-empty">
              <ShoppingBag size={26} />
              <strong>السلة فارغة</strong>
              <span>أضف منتجات لتبدأ طلبك</span>
              <button className="btn btn-primary btn-sm" onClick={() => go('/store/categories')}>تصفّح المنتجات</button>
            </div>
          </div>
        );
      }
      return (
        <div className="dock-tray-inner">
          <div className="dock-tray-head">
            <span className="dock-tray-title"><ShoppingBag size={15} /> سلتك ({count})</span>
          </div>
          <div className="dock-lines">
            {priced.slice(0, 3).map((l) => (
              <div key={`${l.productId}-${l.variantId}`} className="dock-line">
                <span className="dock-line-qty">{l.quantity}×</span>
                <span className="dock-line-name">{l.productNameAr}</span>
                <span className="dock-line-total">{formatMoney(l.lineTotal)}</span>
              </div>
            ))}
            {priced.length > 3 && (
              <div className="dock-line is-more">+{priced.length - 3} منتجات أخرى</div>
            )}
          </div>
          <div className="dock-foot">
            <span className="dock-foot-label">المجموع</span>
            <strong className="dock-foot-total">{formatMoney(subtotal)}</strong>
          </div>
          <div className="dock-actions">
            <button className="btn btn-primary dock-cta" onClick={() => go('/store/checkout')}>
              إتمام الطلب <ChevronLeft size={17} />
            </button>
            <button className="btn btn-outline dock-cta dock-cta-alt" onClick={() => go('/store/cart')}>
              <ShoppingBag size={16} /> عرض السلة
            </button>
          </div>
        </div>
      );
    }

    if (open === 'favorites') {
      if (favCount === 0) {
        return (
          <div className="dock-tray-inner">
            <div className="dock-empty">
              <Heart size={26} />
              <strong>لا مفضلة بعد</strong>
              <span>اضغط القلب على أي منتج لتحفظه هنا</span>
              <button className="btn btn-primary btn-sm" onClick={() => go('/store/categories')}>تصفّح المنتجات</button>
            </div>
          </div>
        );
      }
      return (
        <div className="dock-tray-inner">
          <div className="dock-tray-head">
            <span className="dock-tray-title"><Heart size={15} /> المفضلة ({favCount})</span>
            <button className="dock-tray-all" onClick={() => go('/store/favorites')}>
              عرض الكل <ChevronLeft size={14} />
            </button>
          </div>
          <button className="btn btn-primary dock-cta" onClick={() => go('/store/favorites')}>
            فتح المفضلة <ChevronLeft size={17} />
          </button>
        </div>
      );
    }

    // account
    if (!session) {
      return (
        <div className="dock-tray-inner">
          <div className="dock-empty">
            <User size={26} />
            <strong>لم تسجّل الدخول</strong>
            <span>سجّل الدخول لعرض طلباتك وأسعارك</span>
            <button className="btn btn-primary btn-sm" onClick={() => go('/login')}>
              <LogIn size={15} /> تسجيل الدخول
            </button>
          </div>
        </div>
      );
    }

    const isStaff = session.role !== 'customer';
    const dashHome = session.role === 'admin' ? '/admin' : '/sales';

    return (
      <div className="dock-tray-inner">
        <div className="dock-user">
          <span className="dock-avatar">{(session.name || '؟').trim().charAt(0)}</span>
          <span className="dock-user-text">
            <strong>{session.name}</strong>
            <span>{session.role === 'admin' ? 'مدير المتجر' : session.role === 'sales' ? 'فريق المبيعات' : 'حساب تاجر'}</span>
          </span>
        </div>

        {/* Staff accounts get the dashboard first: their work lives there. */}
        {isStaff && (
          <button className="dock-dash" onClick={() => go(dashHome)}>
            <span className="dock-dash-ico"><LayoutDashboard size={18} /></span>
            <span className="dock-dash-text">
              <strong>لوحة التحكم</strong>
              <small>{session.role === 'admin' ? 'إدارة المتجر والمستخدمين' : 'المنتجات والطلبات'}</small>
            </span>
            <ChevronLeft size={16} />
          </button>
        )}

        <div className="dock-grid">
          <button className="dock-tile" onClick={() => go('/store/account')}>
            <span className="dock-tile-ico"><User size={18} /></span>
            <span>ملفي الشخصي</span>
          </button>
          <button className="dock-tile" onClick={() => go('/store/account?tab=orders')}>
            <span className="dock-tile-ico"><Package size={18} /></span>
            <span>{isStaff ? 'طلبات المتجر' : 'طلباتي'}</span>
          </button>
          <button className="dock-tile" onClick={() => go('/store/account?tab=settings')}>
            <span className="dock-tile-ico"><Settings size={18} /></span>
            <span>بيانات الحساب</span>
          </button>
        </div>

        <button
          className="dock-signout"
          onClick={() => { store.logout(); setOpen(null); navigate('/store'); }}
        >
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </div>
    );
  };

  return (
    <div className="dock" ref={dockRef}>
      <div className={`dock-tray ${open ? 'is-open' : ''}`} style={{ height: open ? trayH : 0 }}>
        <div ref={trayRef}>{tray()}</div>
      </div>

      <div className="dock-bar">
        <span
          className="dock-indicator"
          style={{ insetInlineStart: `calc(${activeIndex} * (100% / ${TABS.length}))`, width: `calc(100% / ${TABS.length} - 14px)` }}
          aria-hidden
        />
        {TABS.map(({ id, label, Icon }) => {
          const isOpen = open === id;
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              className={`dock-btn ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
              onClick={() => setOpen(isOpen ? null : id)}
              aria-label={label}
              aria-expanded={isOpen}
            >
              <span className="dock-btn-ico">
                <Icon size={21} />
                {id === 'cart' && count > 0 && <span className="dock-badge">{count > 99 ? '99+' : count}</span>}
                {id === 'favorites' && favCount > 0 && <span className="dock-badge is-soft">{favCount}</span>}
              </span>
              <span className="dock-btn-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
