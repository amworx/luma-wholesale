import { useData, store, formatMoney } from '@/data/store';
import { PageHeader } from '@/components/ui/Common';
import { useToast } from '@/components/ui/Toast';
import { AlertTriangle } from 'lucide-react';

export function SalesInventory() {
  const data = useData();
  const toast = useToast();
  if (!data) return null;

  const adjust = (productId: string, variantId: string, delta: number) => {
    const p = data.products.find((x) => x.id === productId)!;
    store.upsertProduct({ ...p, variants: p.variants.map((v) => v.id === variantId ? { ...v, stock: Math.max(0, v.stock + delta) } : v), updatedAt: new Date().toISOString() });
    toast.show('تم تحديث الكمية', 'success');
  };

  const rows = data.products.flatMap((p) => p.variants.map((v) => ({ p, v })));

  return (
    <>
      <PageHeader title="المخزون" subtitle="تتبّع الكميات وعدّلها مباشرة — تنبيه عند انخفاض المخزون" />
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>المنتج</th><th>المتغير</th><th>SKU</th><th>التكلفة</th><th>البيع</th><th>الكمية</th><th>تعديل</th></tr></thead>
            <tbody>
              {rows.map(({ p, v }) => (
                <tr key={v.id}>
                  <td><div className="row" style={{ gap: 9 }}><img src={p.images[0]} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} /><span style={{ fontWeight: 700 }}>{p.nameAr}</span></div></td>
                  <td>{v.nameAr}</td>
                  <td className="muted" dir="ltr" style={{ fontSize: 12 }}>{v.sku}</td>
                  <td>{formatMoney(v.costPrice)}</td>
                  <td style={{ color: 'var(--plum-700)', fontWeight: 700 }}>{formatMoney(v.salePrice ?? v.retailPrice)}</td>
                  <td><span className={`badge ${v.stock === 0 ? 'badge-danger' : v.stock <= v.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>{v.stock <= v.lowStockThreshold && <AlertTriangle size={12} />} {v.stock}</span></td>
                  <td><div className="row" style={{ gap: 4 }}><button className="btn btn-outline btn-sm" onClick={() => adjust(p.id, v.id, -1)}>−</button><button className="btn btn-outline btn-sm" onClick={() => adjust(p.id, v.id, 1)}>+</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
