import { useState } from 'react';
import { MessageSquare, Check, Trash2, Info, MessageCircle } from 'lucide-react';
import { useData, store } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, ConfirmButton } from '@/components/ui/Common';

/** Shared enquiries view used by both sales and admin dashboards. */
export function EnquiriesPage() {
  const data = useData();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'open' | 'handled'>('all');
  if (!data) return null;

  const all = [...data.enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const list = all.filter((e) => filter === 'all' ? true : filter === 'open' ? !e.handled : e.handled);
  const openCount = all.filter((e) => !e.handled).length;

  return (
    <>
      <PageHeader title="الاستفسارات والملاحظات" subtitle="رسائل العملاء حول المنتجات — طلبات معلومات وملاحظات"
        actions={<div className="row" style={{ gap: 6 }}>
          {([['all', 'الكل'], ['open', `جديدة (${openCount})`], ['handled', 'تمت المعالجة']] as const).map(([k, label]) => (
            <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>} />
      {list.length ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map((e) => (
            <div key={e.id} className="card card-pad" style={{ borderColor: e.handled ? 'var(--line)' : 'var(--plum-200)' }}>
              <div className="row-between wrap" style={{ gap: 10, marginBottom: 10 }}>
                <div className="row" style={{ gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: e.type === 'info' ? 'var(--info-bg)' : 'var(--rose-100)', color: 'var(--plum-700)', display: 'grid', placeItems: 'center' }}>
                    {e.type === 'info' ? <Info size={18} /> : <MessageCircle size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{e.customerName} <span className="badge badge-neutral" style={{ marginInlineStart: 6 }}>{e.type === 'info' ? 'طلب معلومات' : 'ملاحظة'}</span></div>
                    <div className="muted" style={{ fontSize: 12 }}>{e.productNameAr} · {new Date(e.createdAt).toLocaleString('ar-SY')}</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className={`badge ${e.handled ? 'badge-success' : 'badge-warning'}`}>{e.handled ? 'تمت المعالجة' : 'جديدة'}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => { store.setEnquiryHandled(e.id, !e.handled); toast.show(e.handled ? 'أُعيدت للقائمة' : 'تم تحديدها كمعالجة', 'success'); }}><Check size={14} /> {e.handled ? 'إعادة فتح' : 'معالجة'}</button>
                  <ConfirmButton title="حذف الرسالة" message="سيتم حذف رسالة العميل نهائياً. لا يمكن التراجع." onConfirm={() => { store.deleteEnquiry(e.id); toast.show('تم حذف الرسالة', 'success'); }}><Trash2 size={15} /></ConfirmButton>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.9, margin: '0 0 8px' }}>{e.message}</p>
              <div className="muted row" style={{ gap: 12, fontSize: 12 }}><span dir="ltr">{e.customerPhone}</span><span>المنتج: {e.productNameAr}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد رسائل" description="ستظهر هنا استفسارات العملاء وملاحظاتهم على المنتجات." action={<MessageSquare size={40} color="var(--ink-300)" />} />
      )}
    </>
  );
}

export function SalesEnquiries() { return <EnquiriesPage />; }
export function AdminEnquiries() { return <EnquiriesPage />; }
