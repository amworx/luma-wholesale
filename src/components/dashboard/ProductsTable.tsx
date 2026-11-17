import { useState } from 'react';
import { Search, Pencil, Trash2, Package } from 'lucide-react';
import { useData, store, productStock, formatMoney, effectivePrice } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { ConfirmButton, EmptyState } from '@/components/ui/Common';
import { ProductEditor } from './ProductEditor';

export function ProductsTable({ scope }: { scope: 'all' | 'low' }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  if (!data) return null;
  let products = data.products.filter((p) => {
    const q = search.toLowerCase();
    return (!q || p.nameAr.includes(q) || p.brand.toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q))) &&
      (!category || p.categoryId === category);
  });
  if (scope === 'low') products = products.filter((p) => p.variants.some((v) => v.stock <= v.lowStockThreshold));

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (id: string) => { setEditing(id); setEditorOpen(true); };
  const remove = (id: string) => { store.deleteProduct(id); toast.show('تم حذف المنتج', 'success'); };

  return (
    <>
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={17} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} />
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو SKU..." style={{ paddingRight: 38 }} />
          </div>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 180 }}>
            <option value="">كل الفئات</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNew}><Package size={16} /> منتج جديد</button>
        </div>
        {products.length ? (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>المنتج</th><th>الفئة</th><th>المتغيرات</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const stock = productStock(p);
                  const low = p.variants.some((v) => v.stock <= v.lowStockThreshold);
                  const minPrice = Math.min(...p.variants.map(effectivePrice));
                  return (
                    <tr key={p.id}>
                      <td><div className="row" style={{ gap: 10 }}><img src={p.images[0]} alt="" style={{ width: 44, height: 44, borderRadius: 9, objectFit: 'cover' }} /><div><div style={{ fontWeight: 700 }}>{p.nameAr}</div><div className="muted" style={{ fontSize: 11 }}>{p.brand}</div></div></div></td>
                      <td className="muted">{data.categories.find((c) => c.id === p.categoryId)?.nameAr}</td>
                      <td>{p.variants.length}</td>
                      <td style={{ fontWeight: 700, color: 'var(--plum-700)' }}>{formatMoney(minPrice)}</td>
                      <td><span className={`badge ${stock === 0 ? 'badge-danger' : low ? 'badge-warning' : 'badge-success'}`}>{stock}</span></td>
                      <td><span className={`badge ${p.isActive ? 'badge-success' : 'badge-neutral'}`}>{p.isActive ? 'مفعل' : 'معطل'}</span></td>
                      <td><div className="row" style={{ gap: 4 }}><button className="btn-icon" onClick={() => openEdit(p.id)} title="تعديل"><Pencil size={16} /></button><ConfirmButton onConfirm={() => remove(p.id)}><Trash2 size={16} /></ConfirmButton></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="لا توجد منتجات" description="أضف منتجاً جديداً للبدء." action={<button className="btn btn-primary" onClick={openNew}>إضافة منتج</button>} />}
      </div>
      <ProductEditor open={editorOpen} onClose={() => setEditorOpen(false)} productId={editing} defaultCategory={category || undefined} />
    </>
  );
}
