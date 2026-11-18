import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, Users, ShoppingBag } from 'lucide-react';
import { useData, store, useSession } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { PageHeader, ConfirmButton } from '@/components/ui/Common';
import type { User, Role, AccountStatus } from '@/types';

const roleLabels: Record<Role, string> = { admin: 'مدير النظام', sales: 'فريق المبيعات', customer: 'عميل' };
const roleBadge: Record<Role, string> = { admin: 'badge-plum', sales: 'badge-info', customer: 'badge-neutral' };
const emptyUser = (): User => ({ id: `u-${Date.now()}`, name: '', email: '', password: '', role: 'sales', active: true, createdAt: new Date().toISOString(), avatarColor: '#7c1d4f', customerGroupId: null, accountStatus: 'active', companyName: '' });

export function AdminUsers() {
  const data = useData();
  const session = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<User | null>(null);

  if (!data) return null;
  const edit = (u?: User) => { setForm(u ? structuredClone(u) : emptyUser()); setOpen(true); };
  const save = () => {
    if (!form?.name.trim() || !form.email.trim() || !form.password.trim()) { toast.show('أكمل الاسم والبريد وكلمة المرور', 'error'); return; }
    if (data.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== form.id)) { toast.show('البريد مستخدم بالفعل', 'error'); return; }
    store.upsertUser(form); toast.show('تم حفظ المستخدم', 'success'); setOpen(false);
  };

  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" subtitle="تحكّم بحسابات المديرين وفريق المبيعات والعملاء" actions={<button className="btn btn-primary" onClick={() => edit()}><Plus size={16} /> مستخدم جديد</button>} />
      <div className="card"><div className="table-wrap"><table className="tbl">
        <thead><tr><th>المستخدم</th><th>البريد</th><th>الصلاحية</th><th>الحالة</th><th>تاريخ الانضمام</th><th>إجراءات</th></tr></thead>
        <tbody>{data.users.map((u) => (
          <tr key={u.id}>
            <td><div className="row" style={{ gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: u.avatarColor, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{u.name.charAt(0)}</div><div><div style={{ fontWeight: 700 }}>{u.name}</div>{u.id === session?.userId && <span className="badge badge-success" style={{ fontSize: 9 }}>أنت</span>}</div></div></td>
            <td dir="ltr" style={{ textAlign: 'right', fontSize: 12 }}>{u.email}</td>
            <td><span className={`badge ${roleBadge[u.role]}`}>{u.role === 'admin' ? <ShieldCheck size={12} /> : u.role === 'sales' ? <Users size={12} /> : <ShoppingBag size={12} />} {roleLabels[u.role]}</span></td>
            <td><span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>{u.active ? 'نشط' : 'معطّل'}</span>{u.role === 'customer' && <div style={{ marginTop: 4 }}><span className={`badge ${u.accountStatus === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 9 }}>{u.accountStatus === 'active' ? 'جملة موافق عليه' : u.accountStatus === 'pending' ? 'قيد المراجعة' : u.accountStatus === 'suspended' ? 'موقوف' : 'مرفوض'}</span></div>}</td>
            <td className="muted" style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('ar-SA')}</td>
            <td><div className="row" style={{ gap: 4 }}><button className="btn-icon" onClick={() => edit(u)}><Pencil size={16} /></button>{u.id !== session?.userId && <ConfirmButton onConfirm={() => { store.deleteUser(u.id); toast.show('تم حذف المستخدم', 'success'); }}><Trash2 size={16} /></ConfirmButton>}</div></td>
          </tr>
        ))}</tbody>
      </table></div></div>

      <Modal open={open} onClose={() => setOpen(false)} title={form && data.users.some((u) => u.id === form.id) ? 'تعديل المستخدم' : 'مستخدم جديد'}
        footer={<><button className="btn btn-outline" onClick={() => setOpen(false)}>إلغاء</button><button className="btn btn-primary" onClick={save}>حفظ</button></>}>
        {form && <div style={{ display: 'grid', gap: 16 }}>
          <div className="grid-2">
            <div className="field"><label>الاسم *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>البريد الإلكتروني *</label><input className="input" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>كلمة المرور *</label><input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="field"><label>الصلاحية</label><select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="admin">مدير النظام</option><option value="sales">فريق المبيعات</option><option value="customer">عميل</option></select></div>
          </div>
          {form.role === 'customer' && (
            <>
              <div className="grid-2">
                <div className="field"><label>حالة حساب الجملة</label><select className="select" value={form.accountStatus} onChange={(e) => setForm({ ...form, accountStatus: e.target.value as AccountStatus })}>
                  <option value="pending">قيد المراجعة</option><option value="active">موافق عليه</option><option value="suspended">موقوف</option><option value="rejected">مرفوض</option>
                </select></div>
                <div className="field"><label>مجموعة العملاء (السعر)</label><select className="select" value={form.customerGroupId || ''} onChange={(e) => setForm({ ...form, customerGroupId: e.target.value || null })}>
                  <option value="">بدون مجموعة</option>{data.customerGroups.filter((g) => g.active).map((g) => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
                </select></div>
              </div>
              <div className="field"><label>اسم الجهة / الشركة</label><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="صيدلية، مركز تجميل، متجر..." /></div>
            </>
          )}
          <label className="row" style={{ fontSize: 13, gap: 8 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} style={{ accentColor: 'var(--plum-700)' }} /> حساب نشط</label>
          <p className="muted" style={{ fontSize: 11 }}>ملاحظة: في النسخة التجريبية تُحفظ كلمات المرور محلياً على الجهاز. في الإنتاج استخدم نظام مصادقة حقيقي.</p>
        </div>}
      </Modal>
    </>
  );
}
