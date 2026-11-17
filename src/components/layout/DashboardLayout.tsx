import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings, Store, LogOut, Menu, X, BarChart3, Truck, ShieldCheck } from 'lucide-react';
import { useData, useSession, store } from '@/data/store';

interface NavItem { to: string; label: string; icon: React.ReactNode; end?: boolean }

export function DashboardLayout({ mode }: { mode: 'admin' | 'sales' }) {
  const session = useSession();
  const data = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const adminNav: NavItem[] = [
    { to: '/admin', label: 'نظرة عامة', icon: <LayoutDashboard size={19} />, end: true },
    { to: '/admin/orders', label: 'الطلبات', icon: <ShoppingCart size={19} /> },
    { to: '/admin/products', label: 'المنتجات والمخزون', icon: <Package size={19} /> },
    { to: '/admin/categories', label: 'الفئات', icon: <Tags size={19} /> },
    { to: '/admin/users', label: 'المستخدمون والصلاحيات', icon: <Users size={19} /> },
    { to: '/admin/analytics', label: 'التحليلات', icon: <BarChart3 size={19} /> },
    { to: '/admin/settings', label: 'إعدادات المتجر', icon: <Settings size={19} /> },
  ];
  const salesNav: NavItem[] = [
    { to: '/sales', label: 'نظرة عامة', icon: <LayoutDashboard size={19} />, end: true },
    { to: '/sales/products', label: 'المنتجات', icon: <Package size={19} /> },
    { to: '/sales/inventory', label: 'المخزون', icon: <Truck size={19} /> },
    { to: '/sales/categories', label: 'الفئات', icon: <Tags size={19} /> },
    { to: '/sales/orders', label: 'الطلبات', icon: <ShoppingCart size={19} /> },
  ];
  const nav = mode === 'admin' ? adminNav : salesNav;
  const accent = mode === 'admin' ? 'var(--plum-700)' : 'var(--info)';

  const logout = () => { store.logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
      {/* Sidebar */}
      <aside className={`dash-sidebar ${open ? 'open' : ''}`}>
        <div style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/store" className="row" style={{ gap: 9 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 20 }}>ل</div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--plum-700)' }}>{data?.settings.storeNameAr}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>{mode === 'admin' ? 'لوحة الإدارة' : 'لوحة المبيعات'}</div>
            </div>
          </Link>
          <button className="btn-icon dash-close" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        <div style={{ padding: '0 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-300)', padding: '6px 12px', letterSpacing: 1 }}>القائمة الرئيسية</div>
        </div>
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `dash-nav ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({ background: isActive ? (mode === 'admin' ? 'var(--rose-100)' : 'var(--info-bg)') : 'transparent', color: isActive ? accent : 'var(--ink-700)' })}>
              {item.icon}<span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: 14 }}>
          <Link to="/store" className="dash-nav" style={{ background: 'var(--rose-50)', marginBottom: 6 }}><Store size={19} /><span>عرض المتجر</span></Link>
          <button className="dash-nav" onClick={logout} style={{ color: 'var(--danger)', width: '100%', border: 0 }}><LogOut size={19} /><span>تسجيل الخروج</span></button>
        </div>
      </aside>

      {open && <div className="dash-overlay" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="btn-icon dash-menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="row" style={{ gap: 8 }}>
            <span className={`badge ${mode === 'admin' ? 'badge-plum' : 'badge-info'}`}>
              {mode === 'admin' ? <ShieldCheck size={13} /> : <Truck size={13} />}
              {mode === 'admin' ? 'مدير النظام' : 'فريق المبيعات'}
            </span>
          </div>
          <div className="grow" />
          <div className="row" style={{ gap: 10 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{session?.name}</div>
              <div className="muted" style={{ fontSize: 11 }}>{session?.role === 'admin' ? 'admin@luma.sy' : 'sales@luma.sy'}</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{session?.name.charAt(0)}</div>
          </div>
        </header>
        <div style={{ padding: '26px 30px 50px' }}><Outlet /></div>
      </div>
    </div>
  );
}
