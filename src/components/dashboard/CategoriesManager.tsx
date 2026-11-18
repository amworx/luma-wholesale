import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronLeft, ArrowUp, ArrowDown, ListTree } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useData, store } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmButton, PageHeader } from '@/components/ui/Common';
import type { Category } from '@/types';

const iconNames = ['Palette', 'Sparkles', 'Flower2', 'Brush', 'Sun', 'Hand', 'Heart', 'Gift', 'Star', 'Droplets'];
const colors = ['#b3123f', '#4d8ba3', '#a85480', '#63468a', '#c99a2c', '#8e2b20', '#2e9e6b'];

const emptyCategory = (parentId: string | null): Category => ({
  id: `c-${Date.now()}`, nameAr: '', nameEn: '', descriptionAr: '', icon: 'Sparkles',
  color: '#b3123f', active: true, sortOrder: Date.now() % 1000, parentId,
});

/** Every descendant id of a category (guards against cycles in the tree). */
function descendantIds(categories: Category[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) { out.add(c.id); changed = true; }
    }
  }
  return out;
}

export function CategoriesManager() {
  const data = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Category | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const roots = useMemo(
    () => data ? data.categories.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder) : [],
    [data]
  );

  if (!data) return null;

  const childrenOf = (id: string) => data.categories.filter((c) => c.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  const edit = (c?: Category, parentId: string | null = null) => {
    setForm(c ? structuredClone(c) : emptyCategory(parentId));
    setOpen(true);
  };
  const save = () => {
    if (!form?.nameAr.trim()) { toast.show('أدخل اسم الفئة', 'error'); return; }
    // Prevent a category from becoming its own descendant.
    if (form.parentId && form.id) {
      const descendants = descendantIds(data.categories, form.id);
      if (descendants.has(form.parentId)) { toast.show('لا يمكن جعل الفئة تابعة لإحدى فئاتها الفرعية', 'error'); return; }
    }
    store.upsertCategory(form);
    toast.show('تم حفظ الفئة', 'success');
    setOpen(false);
  };
  const remove = (id: string) => {
    if (data.products.some((p) => p.categoryId === id)) { toast.show('لا يمكن حذف فئة تحتوي منتجات', 'error'); return; }
    if (data.categories.some((c) => c.parentId === id)) { toast.show('احذف الفئات الفرعية أولاً', 'error'); return; }
    store.deleteCategory(id); toast.show('تم حذف الفئة', 'success');
  };
  const move = (c: Category, delta: number) => {
    const siblings = childrenOf(c.parentId || '');
    const i = siblings.findIndex((x) => x.id === c.id);
    const j = i + delta;
    if (j < 0 || j >= siblings.length) return;
    // Swap sortOrder values so both siblings move.
    store.upsertCategory({ ...c, sortOrder: siblings[j].sortOrder });
    store.upsertCategory({ ...siblings[j], sortOrder: c.sortOrder });
  };
  const toggle = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const descendantsOf = (id: string) => descendantIds(data.categories, id).size - 1;

  const renderNode = (c: Category, depth: number) => {
    const children = childrenOf(c.id);
    const isCollapsed = collapsed.has(c.id);
    const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[c.icon] || Icons.Sparkles;
    const productCount = data.products.filter((p) => p.categoryId === c.id).length;
    return (
      <div key={c.id} className="cat-node" style={{ marginInlineStart: depth ? 22 : 0 }}>
        <div className="cat-node-row" style={{ paddingInlineStart: depth ? 10 : 0, borderInlineStart: depth ? '2px solid var(--line)' : 'none' }}>
          {children.length > 0 ? (
            <button className="btn-icon" onClick={() => toggle(c.id)} title={isCollapsed ? 'توسيع' : 'طي'} style={{ width: 26, height: 26 }}>
              {isCollapsed ? <ChevronLeft size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : <span style={{ width: 26 }} />}
          <div style={{ width: 38, height: 38, borderRadius: 11, background: c.color, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><IconComp size={19} /></div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>{c.nameAr}</strong>
              {depth > 0 && <span className="badge badge-neutral" style={{ fontSize: 9 }}>مستوى {depth + 1}</span>}
              <span className={`badge ${c.active ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 9 }}>{c.active ? 'مفعل' : 'معطل'}</span>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              {productCount} منتج{descendantsOf(c.id) > 0 ? ` · ${descendantsOf(c.id)} فئة فرعية` : ''}{c.descriptionAr ? ` · ${c.descriptionAr}` : ''}
            </div>
          </div>
          <div className="row" style={{ gap: 2, flexShrink: 0 }}>
            <button className="btn-icon" onClick={() => move(c, -1)} title="تحريك للأعلى"><ArrowUp size={14} /></button>
            <button className="btn-icon" onClick={() => move(c, 1)} title="تحريك للأسفل"><ArrowDown size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => edit(undefined, c.id)} title="إضافة فئة فرعية"><Plus size={14} /> فرعية</button>
            <button className="btn-icon" onClick={() => edit(c)} title="تعديل"><Pencil size={15} /></button>
            <ConfirmButton onConfirm={() => remove(c.id)}><Trash2 size={15} /></ConfirmButton>
          </div>
        </div>
        {!isCollapsed && children.map((ch) => renderNode(ch, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <PageHeader title="الفئات والفئات الفرعية" subtitle="شجرة فئات متعددة المستويات — أنشئ فئات فرعية داخل فئات فرعية بلا حدود" actions={<button className="btn btn-primary" onClick={() => edit()}><Plus size={16} /> فئة رئيسية</button>} />
      <div className="card" style={{ padding: '8px 4px' }}>
        {roots.length ? roots.map((c) => renderNode(c, 0)) : <div className="center muted" style={{ padding: 40 }}><ListTree size={36} style={{ opacity: .4 }} /><p>لا توجد فئات بعد.</p></div>}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.8 }}>
        يمكنك إنشاء أي عدد من المستويات: فئة رئيسية ← فئة فرعية ← فئة فرعية من الدرجة الثانية، وهكذا. استخدم الأسهم لترتيب الفئات داخل مستواها، وزر «فرعية» لإضافة مستوى أعمق. لا يمكن حذف فئة تحتوي منتجات أو فئات فرعية.
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title={form?.id && data.categories.some((c) => c.id === form.id) ? 'تعديل الفئة' : 'فئة جديدة'}
        footer={<><button className="btn btn-outline" onClick={() => setOpen(false)}>إلغاء</button><button className="btn btn-primary" onClick={save}>حفظ</button></>}>
        {form && <div style={{ display: 'grid', gap: 16 }}>
          <div className="grid-2">
            <div className="field"><label>الاسم (عربي) *</label><input className="input" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></div>
            <div className="field"><label>الاسم (إنجليزي)</label><input className="input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></div>
          </div>
          <div className="field"><label>الوصف</label><input className="input" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} /></div>
          <div className="field"><label>الفئة الأم (اتركها فارغة لفئة رئيسية)</label>
            <select className="select" value={form.parentId || ''} onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}>
              <option value="">فئة رئيسية</option>
              {data.categories.filter((c) => c.id !== form.id && !(form.id && descendantIds(data.categories, form.id).has(c.id))).map((c) => {
                const depth = (() => { let d = 0, p = c.parentId; while (p) { d++; p = data.categories.find((x) => x.id === p)?.parentId || null; } return d; })();
                return <option key={c.id} value={c.id}>{'— '.repeat(depth)}{c.nameAr}</option>;
              })}
            </select>
          </div>
          <div className="field"><label>الأيقونة</label><div className="row wrap">{iconNames.map((n) => { const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[n]; return <button key={n} type="button" className={`btn-icon ${form.icon === n ? 'active-icon' : ''}`} style={{ border: form.icon === n ? '2px solid var(--plum-700)' : '1px solid var(--line)' }} onClick={() => setForm({ ...form, icon: n })}><I size={18} /></button>; })}</div></div>
          <div className="field"><label>اللون</label><div className="row wrap">{colors.map((c) => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: 9, background: c, border: form.color === c ? '3px solid var(--ink-900)' : '2px solid #fff', boxShadow: 'var(--shadow-sm)' }} />)}</div></div>
          <label className="row" style={{ fontSize: 13, gap: 8 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} style={{ accentColor: 'var(--plum-700)' }} /> فئة مفعلة</label>
        </div>}
      </Modal>
    </>
  );
}
