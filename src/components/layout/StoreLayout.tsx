import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X, Heart, MapPin, Phone, Instagram, Sparkles } from 'lucide-react';
import { useData, useSession, useSaveStatus, retrySave } from '@/data/store';
import { useCart } from '@/state/CartContext';
import { MegaMenu } from '@/components/store/MegaMenu';
import { BottomDock } from '@/components/store/BottomDock';

export function StoreLayout() {
  const data = useData();
  const session = useSession();
  const saveStatus = useSaveStatus();
  const { count } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) { navigate(`/store/search?q=${encodeURIComponent(search.trim())}`); setMenuOpen(false); }
  };

  const dashLink = session?.role === 'admin' ? '/admin' : session?.role === 'sales' ? '/sales' : null;

  return (
    <div className="store-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 72 }}>
      {/* Cloud save status: failures must never be silent */}
      {(saveStatus === 'offline' || saveStatus === 'conflict' || saveStatus === 'error') && (
        <div style={{ background: 'var(--danger)', color: '#fff', textAlign: 'center', padding: '7px 16px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>
            {saveStatus === 'offline' && 'لا يوجد اتصال — التغييرات محفوظة على الجهاز وستُرسل تلقائياً عند عودة الاتصال'}
            {saveStatus === 'conflict' && 'تعذّر مزامنة التغييرات بعد عدة محاولات — التغييرات محفوظة على جهازك'}
            {saveStatus === 'error' && 'تعذّر حفظ التغييرات — التغييرات محفوظة على جهازك'}
          </span>
          <button type="button" onClick={retrySave} style={{ background: '#fff', color: 'var(--danger)', border: 0, borderRadius: 8, padding: '3px 12px', fontWeight: 800, cursor: 'pointer' }}>إعادة المحاولة</button>
        </div>
      )}

      {/* Announcement bar */}
      {data?.settings.announcementsAr[0] && (
        <div style={{ background: 'linear-gradient(90deg, var(--plum-800), var(--plum-600))', color: '#fff', textAlign: 'center', padding: '7px 16px', fontSize: 12, fontWeight: 600 }}>
          <Sparkles size={13} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
          {data.settings.announcementsAr[0]}
        </div>
      )}

      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-sm)' }}>
        <div className="container" style={{ height: 66, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn-icon" style={{ display: 'none' }} onClick={() => setMenuOpen(!menuOpen)}><Menu size={22} /></button>
          <Link to="/store" className="row" style={{ gap: 8, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, var(--plum-700), var(--plum-500))', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 22, fontWeight: 800 }}>ل</div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--plum-700)' }}>{data?.settings.storeNameAr || 'لُما'}</div>
              <div style={{ fontSize: 9, color: 'var(--ink-500)', letterSpacing: 1 }}>WHOLESALE</div>
            </div>
          </Link>

          <form onSubmit={submitSearch} className="grow" style={{ maxWidth: 420, marginInline: 'auto', position: 'relative' }}>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن منتج، ماركة، أو فئة..."
              style={{ paddingRight: 40, borderRadius: 99, background: 'var(--canvas)' }} />
            <button type="submit" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'none', color: 'var(--ink-500)' }}><Search size={19} /></button>
          </form>

          <div className="row header-actions" style={{ gap: 4, flexShrink: 0 }}>
            <NavLink to="/store/bulk-order" className="btn btn-primary btn-sm bulk-nav-btn" title="طلب بالجملة — أدخل الأكواد والكميات دفعة واحدة">طلب بالجملة</NavLink>
            <NavLink to="/store/favorites" className="btn-icon" title="المفضلة"><Heart size={21} /></NavLink>
            <Link to={session ? (dashLink || '/store/account') : '/login'} className="btn-icon" title={session ? session.name : 'حسابي'}><User size={21} /></Link>
            <Link to="/store/cart" className="btn-icon" title="السلة" style={{ position: 'relative' }}>
              <ShoppingBag size={21} />
              {count > 0 && <span style={{ position: 'absolute', top: -2, left: -4, background: 'var(--plum-700)', color: '#fff', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, display: 'grid', placeItems: 'center', padding: '0 4px', fontWeight: 800 }}>{count}</span>}
            </Link>
          </div>
        </div>

        {/* Category navigation with mega menu */}
        <MegaMenu />
      </header>

      {menuOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
          <div style={{ background: '#fff', width: '80%', height: '100%', padding: 24, position: 'absolute', right: 0, top: 0 }}>
            <div className="row-between" style={{ marginBottom: 24 }}><strong>القائمة</strong><button className="btn-icon" onClick={() => setMenuOpen(false)}><X /></button></div>
            {dashLink && <Link to={dashLink} className="btn btn-primary btn-block" style={{ marginBottom: 16 }}>لوحة التحكم</Link>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link to="/store" onClick={() => setMenuOpen(false)}>الرئيسية</Link>
              <Link to="/store/categories" onClick={() => setMenuOpen(false)}>كل المنتجات</Link>
              <Link to="/store/offers" onClick={() => setMenuOpen(false)}>العروض</Link>
              <Link to="/store/account" onClick={() => setMenuOpen(false)}>حسابي</Link>
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1 }}><Outlet /></main>

      <footer style={{ background: 'var(--plum-900)', color: '#f3e6ee', marginTop: 60 }}>
        <div className="container" style={{ padding: '48px 0 28px' }}>
          <div className="grid-4" style={{ gap: 30 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 10 }}>{data?.settings.storeNameAr || 'لُما'} <span style={{ fontSize: 13, fontWeight: 500 }}>WHOLESALE</span></div>
              <p style={{ fontSize: 13, opacity: .75, lineHeight: 1.9 }}>{data?.settings.taglineAr}. تشكيلة واسعة من مستحضرات التجميل والعناية بأسعار الجملة للتجار والمراكز.</p>
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: 14, fontSize: 15 }}>تصفّح</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, opacity: .8 }}>
                <Link to="/store/categories">كل المنتجات</Link>
                <Link to="/store/offers">العروض والخصومات</Link>
                <Link to="/store/category/c-skin">العناية بالبشرة</Link>
                <Link to="/store/category/c-fragrance">العطور</Link>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: 14, fontSize: 15 }}>تواصل معنا</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, opacity: .8 }}>
                <span className="row" style={{ gap: 8 }}><Phone size={15} /> {data?.settings.contactPhone}</span>
                <span className="row" style={{ gap: 8 }}><Instagram size={15} /> {data?.settings.instagram}</span>
                <span className="row" style={{ gap: 8 }}><MapPin size={15} /> {data?.settings.addressAr}</span>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', marginBottom: 14, fontSize: 15 }}>نشرة لُما</h4>
              <p style={{ fontSize: 13, opacity: .75, marginBottom: 12 }}>اشترك لتصلك أحدث العروض والمنتجات.</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" placeholder="بريدك الإلكتروني" style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }} />
                <button className="btn btn-gold btn-sm">اشتراك</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', marginTop: 34, paddingTop: 18, textAlign: 'center', fontSize: 12, opacity: .6 }}>
            © 2026 {data?.settings.storeNameAr || 'لُما'}. جميع الحقوق محفوظة. نسخة تجريبية للعرض.
          </div>
        </div>
      </footer>

      {/* Floating bottom dock (mobile app shell) */}
      <BottomDock />
    </div>
  );
}

