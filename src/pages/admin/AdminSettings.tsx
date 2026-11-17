import { useState } from 'react';
import { Settings, Save, RotateCcw, Store } from 'lucide-react';
import { useData, store } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/Common';
import type { StoreSettings } from '@/types';

export function AdminSettings() {
  const data = useData();
  const toast = useToast();
  const [form, setForm] = useState<StoreSettings | null>(null);
  if (!data) return null;
  const f = form || data.settings;
  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setForm({ ...f, [k]: v });

  const save = () => { store.setSettings(f); setForm(null); toast.show('تم حفظ الإعدادات', 'success'); };
  const reset = () => {
    if (window.confirm('سيتم إعادة كل البيانات إلى الحالة الأصلية وحذف التعديلات والطلبات. هل أنت متأكد؟')) {
      store.resetData(); setForm(null); toast.show('تمت إعادة البيانات الأصلية', 'success');
    }
  };

  return (
    <>
      <PageHeader title="إعدادات المتجر" subtitle="خصّص هوية المتجر ومعلومات التواصل والشحن" actions={<button className="btn btn-primary" onClick={save}><Save size={16} /> حفظ التغييرات</button>} />
      <div style={{ display: 'grid', gap: 18, maxWidth: 900 }}>
        <div className="card card-pad">
          <h3 className="row" style={{ fontSize: 17, marginBottom: 18 }}><Store size={19} color="var(--plum-600)" /> هوية المتجر</h3>
          <div className="grid-2">
            <div className="field"><label>اسم المتجر (عربي)</label><input className="input" value={f.storeNameAr} onChange={(e) => set('storeNameAr', e.target.value)} /></div>
            <div className="field"><label>اسم المتجر (إنجليزي)</label><input className="input" value={f.storeNameEn} onChange={(e) => set('storeNameEn', e.target.value)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>الشعار / الوصف القصير</label><input className="input" value={f.taglineAr} onChange={(e) => set('taglineAr', e.target.value)} /></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="row" style={{ fontSize: 17, marginBottom: 18 }}><Settings size={19} color="var(--plum-600)" /> معلومات التواصل</h3>
          <div className="grid-2">
            <div className="field"><label>رقم الهاتف</label><input className="input" dir="ltr" value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></div>
            <div className="field"><label>البريد الإلكتروني</label><input className="input" dir="ltr" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></div>
            <div className="field"><label>إنستغرام</label><input className="input" dir="ltr" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} /></div>
            <div className="field"><label>واتساب</label><input className="input" dir="ltr" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>العنوان</label><input className="input" value={f.addressAr} onChange={(e) => set('addressAr', e.target.value)} /></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 17, marginBottom: 18 }}>الشحن والعملة</h3>
          <div className="grid-3">
            <div className="field"><label>رمز العملة</label><input className="input" value={f.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} /></div>
            <div className="field"><label>رسوم الشحن الافتراضية ($)</label><input className="input" type="number" value={f.defaultShippingFee / 100} onChange={(e) => set('defaultShippingFee', Number(e.target.value) * 100)} /></div>
            <div className="field"><label>شحن مجاني فوق ($)</label><input className="input" type="number" value={f.freeShippingOver / 100} onChange={(e) => set('freeShippingOver', Number(e.target.value) * 100)} /></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 17, marginBottom: 14 }}>الإعلانات (تظهر في أعلى المتجر)</h3>
          {f.announcementsAr.map((a, i) => (
            <div key={i} className="row" style={{ gap: 8, marginBottom: 8 }}><input className="input" value={a} onChange={(e) => set('announcementsAr', f.announcementsAr.map((x, j) => j === i ? e.target.value : x))} /><button className="btn-icon" onClick={() => set('announcementsAr', f.announcementsAr.filter((_, j) => j !== i))}>×</button></div>
          ))}
          <button className="btn btn-outline btn-sm" onClick={() => set('announcementsAr', [...f.announcementsAr, 'إعلان جديد'])}>+ إضافة إعلان</button>
        </div>
        <div className="card card-pad" style={{ borderColor: 'var(--danger)' }}>
          <h3 className="row" style={{ fontSize: 17, marginBottom: 8, color: 'var(--danger)' }}><RotateCcw size={19} /> إعادة ضبط البيانات</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>إعادة كل المنتجات والفئات والطلبات والمستخدمين إلى البيانات الأصلية. سيتم حذف كل التعديلات.</p>
          <button className="btn btn-danger" onClick={reset}>إعادة البيانات الأصلية</button>
        </div>
      </div>
    </>
  );
}
