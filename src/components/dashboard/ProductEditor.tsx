import { useEffect, useState } from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useData, store, assetUrl } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import type { Product, ProductVariant, ShippingType } from '@/types';

const emptyVariant = (): ProductVariant => ({
  id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  nameAr: '', sku: '', barcode: '', costPrice: 0, retailPrice: 0, salePrice: null,
  stock: 0, lowStockThreshold: 5, weightGrams: 100, packSize: 1, moq: 1,
});

const emptyProduct = (categoryId: string): Product => ({
  id: `p-${Date.now()}`, nameAr: '', nameEn: '', descriptionAr: '', shortDescriptionAr: '',
  categoryId, brand: '', tags: [], images: [assetUrl('images/lipstick-velvet.svg')],
  variants: [emptyVariant()], shipping: 'standard', shippingFee: 1500, freeShippingOver: 20000,
  isFeatured: false, isNew: true, isActive: true, rating: 5, reviewCount: 0,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

const imageChoices = [
  'lipstick-velvet', 'lipstick-coral', 'lipstick-nude', 'serum-glow', 'serum-hyaluronic',
  'foundation', 'perfume-rose', 'perfume-amber', 'cream-jar', 'eye-shadow', 'mascara',
  'blush', 'sunscreen', 'cleanser', 'lip-gloss', 'nail-polish',
];

export function ProductEditor({ open, onClose, productId, defaultCategory }: {
  open: boolean; onClose: () => void; productId?: string | null; defaultCategory?: string;
}) {
  const data = useData();
  const toast = useToast();
  const [form, setForm] = useState<Product | null>(null);

  useEffect(() => {
    if (!open || !data) return;
    const existing = productId ? data.products.find((p) => p.id === productId) : null;
    setForm(existing ? structuredClone(existing) : emptyProduct(defaultCategory || data.categories[0]?.id || ''));
  }, [open, productId, defaultCategory, data]);

  if (!form || !data) return null;
  const set = <K extends keyof Product>(key: K, value: Product[K]) => setForm({ ...form, [key]: value });

  const updateVariant = (idx: number, patch: Partial<ProductVariant>) => {
    set('variants', form.variants.map((v, i) => i === idx ? { ...v, ...patch } : v));
  };

  const save = () => {
    if (!form.nameAr.trim()) { toast.show('أدخل اسم المنتج', 'error'); return; }
    if (!form.variants.length) { toast.show('أضف متغيراً واحداً على الأقل', 'error'); return; }
    if (form.variants.some((v) => !v.nameAr.trim() || v.retailPrice <= 0)) {
      toast.show('أكمل أسماء المتغيرات وأسعار البيع', 'error'); return;
    }
    store.upsertProduct({ ...form, updatedAt: new Date().toISOString() });
    toast.show(productId ? 'تم تحديث المنتج' : 'تمت إضافة المنتج', 'success');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={productId ? 'تعديل المنتج' : 'منتج جديد'} wide
      footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={save}>حفظ المنتج</button></>}>
      <div style={{ display: 'grid', gap: 22 }}>
        {/* Basic info */}
        <div>
          <h4 style={{ fontSize: 15, marginBottom: 14, color: 'var(--plum-700)' }}>المعلومات الأساسية</h4>
          <div className="grid-2">
            <div className="field"><label>اسم المنتج (عربي) *</label><input className="input" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} /></div>
            <div className="field"><label>اسم المنتج (إنجليزي)</label><input className="input" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></div>
            <div className="field"><label>الفئة</label><select className="select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}</select></div>
            <div className="field"><label>العلامة التجارية</label><input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="لُما بيوتي" /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>وصف قصير</label><input className="input" value={form.shortDescriptionAr} onChange={(e) => set('shortDescriptionAr', e.target.value)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>الوصف الكامل</label><textarea className="textarea" value={form.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} /></div>
            <div className="field"><label>الوسوم (افصل بفاصلة)</label><input className="input" value={form.tags.join('، ')} onChange={(e) => set('tags', e.target.value.split(/[،,]/).map((t) => t.trim()).filter(Boolean))} /></div>
            <div className="field"><label>التقييم</label><input className="input" type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => set('rating', Number(e.target.value))} /></div>
          </div>
        </div>

        {/* Image picker */}
        <div>
          <h4 style={{ fontSize: 15, marginBottom: 12, color: 'var(--plum-700)' }} className="row"><ImageIcon size={16} /> صورة المنتج</h4>
          <div className="image-picker">
            {imageChoices.map((name) => {
              const src = assetUrl(`images/${name}.svg`);
              const selected = form.images[0] === src;
              return <button key={name} type="button" className={`image-choice ${selected ? 'active' : ''}`} onClick={() => set('images', [src])}><img src={src} alt={name} /></button>;
            })}
          </div>
        </div>

        {/* Variants */}
        <div>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 15, color: 'var(--plum-700)' }}>المتغيرات (الألوان / المقاسات)</h4>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => set('variants', [...form.variants, emptyVariant()])}><Plus size={15} /> إضافة متغير</button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {form.variants.map((v, idx) => (
              <div key={v.id} className="variant-editor">
                <div className="row-between" style={{ marginBottom: 12 }}><strong style={{ fontSize: 13 }}>متغير {idx + 1}</strong>{form.variants.length > 1 && <button type="button" className="btn-icon" onClick={() => set('variants', form.variants.filter((_, i) => i !== idx))}><Trash2 size={16} color="var(--danger)" /></button>}</div>
                <div className="grid-4">
                  <div className="field"><label>الاسم *</label><input className="input" value={v.nameAr} onChange={(e) => updateVariant(idx, { nameAr: e.target.value })} placeholder="أحمر كرزي" /></div>
                  <div className="field"><label>SKU</label><input className="input" value={v.sku} onChange={(e) => updateVariant(idx, { sku: e.target.value })} placeholder="LM-01" /></div>
                  <div className="field"><label>سعر التكلفة ($)</label><input className="input" type="number" min={0} value={v.costPrice / 100} onChange={(e) => updateVariant(idx, { costPrice: Number(e.target.value) * 100 })} /></div>
                  <div className="field"><label>سعر البيع ($) *</label><input className="input" type="number" min={0} value={v.retailPrice / 100} onChange={(e) => updateVariant(idx, { retailPrice: Number(e.target.value) * 100 })} /></div>
                  <div className="field"><label>سعر الخصم ($)</label><input className="input" type="number" min={0} value={v.salePrice === null ? '' : v.salePrice / 100} onChange={(e) => updateVariant(idx, { salePrice: e.target.value === '' ? null : Number(e.target.value) * 100 })} placeholder="اختياري" /></div>
                  <div className="field"><label>الكمية المتوفرة</label><input className="input" type="number" min={0} value={v.stock} onChange={(e) => updateVariant(idx, { stock: Number(e.target.value) })} /></div>
                  <div className="field"><label>حد التنبيه</label><input className="input" type="number" min={0} value={v.lowStockThreshold} onChange={(e) => updateVariant(idx, { lowStockThreshold: Number(e.target.value) })} /></div>
                  <div className="field"><label>اللون (Hex)</label><input className="input" type="color" value={v.colorHex || '#b3123f'} onChange={(e) => updateVariant(idx, { colorHex: e.target.value })} style={{ padding: 4, height: 42 }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & flags */}
        <div>
          <h4 style={{ fontSize: 15, marginBottom: 14, color: 'var(--plum-700)' }}>الشحن والعرض</h4>
          <div className="grid-3">
            <div className="field"><label>نوع الشحن</label><select className="select" value={form.shipping} onChange={(e) => set('shipping', e.target.value as ShippingType)}>
              <option value="standard">عادي</option><option value="express">سريع</option><option value="free">مجاني</option><option value="local_pickup">استلام من المحل</option>
            </select></div>
            <div className="field"><label>رسوم الشحن ($)</label><input className="input" type="number" min={0} value={form.shippingFee / 100} onChange={(e) => set('shippingFee', Number(e.target.value) * 100)} /></div>
            <div className="field"><label>شحن مجاني فوق ($)</label><input className="input" type="number" min={0} value={(form.freeShippingOver || 0) / 100} onChange={(e) => set('freeShippingOver', Number(e.target.value) * 100)} /></div>
          </div>
          <div className="row wrap" style={{ gap: 20, marginTop: 16 }}>
            {([['isActive', 'مفعل'], ['isFeatured', 'مميز'], ['isNew', 'جديد']] as const).map(([key, label]) => (
              <label key={key} className="row" style={{ fontSize: 13, cursor: 'pointer', gap: 7 }}><input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} style={{ accentColor: 'var(--plum-700)' }} />{label}</label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
