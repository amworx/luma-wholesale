import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useData, store } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmButton, PageHeader } from '@/components/ui/Common';
import type { Category } from '@/types';

const iconNames = ['Palette', 'Sparkles', 'Flower2', 'Brush', 'Sun', 'Hand', 'Heart', 'Gift', 'Star', 'Droplets'];
const colors = ['#b3123f', '#4d8ba3', '#a85480', '#63468a', '#c99a2c', '#8e2b20', '#2e9e6b'];

const emptyCategory = (): Category => ({
  id: `c-${Date.now()}`, nameAr: '', nameEn: '', descriptionAr: '', icon: 'Sparkles',
  color: '#b3123f', active: true, sortOrder: Date.now() % 1000,
});

export function CategoriesManager() {
  const data = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Category | null>(null);

  if (!data) return null;
  const edit = (c?: Category) => { setForm(c ? structuredClone(c) : emptyCategory()); setOpen(true); };
  const save = () => {
    if (!form?.nameAr.trim()) { toast.show('أدخل اسم الفئة', 'error'); return; }
    store.upsertCategory(form); toast.show('تم حفظ الفئة', 'success'); setOpen(false);
  };
  const remove = (id: string) => {
    if (data.products.some((p) => p.categoryId === id)) { toast.show('لا يمكن حذف فئة تحتوي منتجات', 'error'); return; }
    store.deleteCategory(id); toast.show('تم حذف الفئة', 'success');
  };

  return (
    <>
      <PageHeader title="الفئات" subtitle="نظّم منتجاتك في فئات سهلة التصفح" actions={<button className="btn btn-primary" onClick={() => edit()}><Plus size={16} /> فئة جديدة</button>} />
      <div className="grid-3">
        {data.categories.map((c) => {
          const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[c.icon] || Icons.Sparkles;
          return (
            <div key={c.id} className="card card-pad">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: c.color, color: '#fff', display: 'grid', placeItems: 'center' }}><IconComp size={22} /></div>
                <div className="row" style={{ gap: 2 }}><button className="btn-icon" onClick={() => edit(c)}><Pencil size={16} /></button><ConfirmButton onConfirm={() => remove(c.id)}><Trash2 size={16} /></ConfirmButton></div>
              </div>
              <h3 style={{ fontSize: 17 }}>{c.nameAr}</h3>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 12px' }}>{c.descriptionAr}</p>
              <div className="row-between"><span className="badge badge-neutral">{data.products.filter((p) => p.categoryId === c.id).length} منتج</span><span className={`badge ${c.active ? 'badge-success' : 'badge-neutral'}`}>{c.active ? 'مفعل' : 'معطل'}</span></div>
            </div>
          );
        })}
        <button className="cat-add" onClick={() => edit()}><Tag size={28} /><span>إضافة فئة جديدة</span></button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form?.id && data.categories.some((c) => c.id === form.id) ? 'تعديل الفئة' : 'فئة جديدة'}
        footer={<><button className="btn btn-outline" onClick={() => setOpen(false)}>إلغاء</button><button className="btn btn-primary" onClick={save}>حفظ</button></>}>
        {form && <div style={{ display: 'grid', gap: 16 }}>
          <div className="grid-2">
            <div className="field"><label>الاسم (عربي) *</label><input className="input" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
            <div className="field"><label>الاسم (إنجليزي)</label><input className="input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></div>
          </div>
          <div className="field"><label>الوصف</label><input className="input" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} /></div>
          <div className="field"><label>الأيقونة</label><div className="row wrap">{iconNames.map((n) => { const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[n]; return <button key={n} type="button" className={`btn-icon ${form.icon === n ? 'active-icon' : ''}`} style={{ border: form.icon === n ? '2px solid var(--plum-700)' : '1px solid var(--line)' }} onClick={() => setForm({ ...form, icon: n })}><I size={18} /></button>; })}</div></div>
          <div className="field"><label>اللون</label><div className="row wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: 9, background: c, border: form.color === c ? '3px solid var(--ink-900)' : '2px solid #fff', boxShadow: 'var(--shadow-sm)' }} />)}</div></div>
          <label className="row" style={{ fontSize: 13, gap: 8 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} style={{ accentColor: 'var(--plum-700)' }} /> فئة مفعلة</label>
        </div>}
      </Modal>
    </>
  );
}
