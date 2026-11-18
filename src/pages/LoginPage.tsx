import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Sparkles, ShieldCheck, Users, ShoppingBag, Eye, EyeOff, ArrowRight, Home } from 'lucide-react';
import { store, useSession } from '@/data/store';
import { useToast } from '@/components/ui/Toast';

const demos = [
  { role: 'مدير النظام', email: 'admin@luma.sy', pass: 'admin123', icon: <ShieldCheck size={18} />, tone: 'plum' },
  { role: 'فريق المبيعات', email: 'sales@luma.sy', pass: 'sales123', icon: <Users size={18} />, tone: 'blue' },
  { role: 'عميل', email: 'customer@example.com', pass: 'customer123', icon: <ShoppingBag size={18} />, tone: 'gold' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const session = useSession();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  if (session) {
    const dest = session.role === 'admin' ? '/admin' : session.role === 'sales' ? '/sales' : '/store';
    navigate(dest, { replace: true });
  }

  const doLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.login(email, password);
    if (!res.ok) { setError(res.error || 'خطأ'); return; }
    toast.show('أهلاً بك!', 'success');
    const s = store.getSessionSnapshot();
    navigate(s?.role === 'admin' ? '/admin' : s?.role === 'sales' ? '/sales' : '/store', { replace: true });
  };

  const quickLogin = (mail: string, pass: string) => {
    const res = store.login(mail, pass);
    if (res.ok) {
      toast.show('تم الدخول بالحساب التجريبي', 'success');
      const s = store.getSessionSnapshot();
      navigate(s?.role === 'admin' ? '/admin' : s?.role === 'sales' ? '/sales' : '/store', { replace: true });
    }
  };

  const register = () => {
    if (!email || !password) { setError('أدخل البريد وكلمة المرور'); return; }
    const res = store.registerCustomer(email.split('@')[0], email, password);
    if (!res.ok) { setError(res.error || 'خطأ'); return; }
    toast.show('تم إنشاء الحساب بنجاح', 'success');
    navigate('/store', { replace: true });
  };

  return (
    <div className="login-page">
      <Link to="/store" className="login-home"><Home size={16} /> العودة إلى المتجر</Link>
      <div className="login-shell">
        <aside className="login-aside">
          <div className="login-aside-brand">
            <div className="login-aside-logo">ل</div>
            <div>
              <strong>لمسة</strong>
              <span>WHOLESALE</span>
            </div>
          </div>
          <h2>بوابة التجار</h2>
          <p>اطلب بالجملة، تابع أسعارك الخاصة، وأدر طلباتك من مكان واحد.</p>
          <ul className="login-aside-list">
            <li><Sparkles size={16} /> أسعار جملة حسب الكمية ونوع الحساب</li>
            <li><ShoppingBag size={16} /> طلب سريع بالكميات وأكواد المنتجات</li>
            <li><Users size={16} /> متابعة الطلبات مع فريق المبيعات</li>
          </ul>
          <div className="login-aside-foot">نسخة تجريبية للعرض — البيانات متزامنة بين الأجهزة.</div>
        </aside>

        <div className="login-card">
          <div className="center" style={{ marginBottom: 24 }}>
            <div className="login-mark">ل</div>
            <h1 style={{ fontSize: 23 }}>مرحباً بك في لمسة</h1>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>سجّل الدخول للمتابعة</p>
          </div>

          <form onSubmit={doLogin}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} />
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ paddingRight: 40 }} required />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} />
                <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 40, paddingLeft: 40 }} required />
                <button type="button" className="btn-icon" style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>تسجيل الدخول</button>
          </form>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 6, fontSize: 13 }} onClick={register}>ليس لديك حساب؟ أنشئ حساباً جديداً</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 16px', color: 'var(--ink-300)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} /> دخول سريع (تجريبي) <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {demos.map((d) => (
              <button key={d.email} className={`demo-btn demo-${d.tone}`} onClick={() => quickLogin(d.email, d.pass)}>
                {d.icon}<span>{d.role}</span><span className="muted" style={{ fontSize: 11, marginRight: 'auto' }} dir="ltr">{d.email}</span>
              </button>
            ))}
          </div>

          <Link to="/store" className="login-back-store">
            متابعة التصفح كزائر <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
