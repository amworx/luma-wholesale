import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, Package, RotateCcw, Tag, ArrowLeft, CheckCircle2, Layers } from 'lucide-react';
import { useData, formatMoney } from '@/data/store';
import { resolveUnitPrice } from '@/data/pricing';
import { useCart } from '@/state/CartContext';
import { useSession } from '@/data/store';
import { useToast } from '@/components/ui/Toast';

interface Row { productId: string; variantId: string; qty: number }

/**
 * Wholesale quick-order page: type quantities directly, search by SKU or name,
 * see live tier pricing, and reorder from a previous order. All quantities are
 * reference data; the sales team confirms the final order manually.
 */
export function BulkOrderPage() {
  const data = useData();
  const session = useSession();
  const { addMany } = useCart();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Record<string, number>>({}); // variantId -> qty

  const customer = useMemo(
    () => (data && session ? data.users.find((u) => u.id === session.userId) || null : null),
    [data, session]
  );

  const products = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.products.filter((p) => {
      if (!p.isActive) return false;
      if (!q) return true;
      return p.nameAr.includes(q) || p.nameEn.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q));
    });
  }, [data, query]);

  if (!data) return null;

  const setQty = (variantId: string, qty: number) => setRows((r) => ({ ...r, [variantId]: Math.max(0, qty) }));

  const selected: Row[] = Object.entries(rows)
    .filter(([, qty]) => qty > 0)
    .map(([variantId, qty]) => {
      const product = data.products.find((p) => p.variants.some((v) => v.id === variantId))!;
      return { productId: product.id, variantId, qty };
    });

  const totals = selected.reduce((acc, row) => {
    const product = data.products.find((p) => p.id === row.productId)!;
    const variant = product.variants.find((v) => v.id === row.variantId)!;
    const price = resolveUnitPrice(data, variant, product.id, row.qty, customer).unitPrice;
    return { units: acc.units + row.qty, amount: acc.amount + price * row.qty };
  }, { units: 0, amount: 0 });

  const addToCart = () => {
    if (!selected.length) { toast.show('أدخل كمية لمنتج واحد على الأقل', 'error'); return; }
    addMany(selected.map((r) => ({ productId: r.productId, variantId: r.variantId, quantity: r.qty })));
    toast.show(`تمت إضافة ${selected.length} صنف للسلة`, 'success');
    setRows({});
  };

  const reorder = () => {
    const mine = data.orders.filter((o) => !o.customerId || o.customerId === session?.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!mine) { toast.show('لا توجد طلبات سابقة لإعادة طلبها', 'error'); return; }
    const next: Record<string, number> = {};
    mine.lines.forEach((l) => { next[l.variantId] = (next[l.variantId] || 0) + l.quantity; });
    setRows(next);
    toast.show(`تم تحميل أصناف الطلب ${mine.orderNumber}`, 'success');
  };

  return (
    <div className="container bulk-page">
      <div className="bulk-head">
        <div>
          <h1 className="section-title row" style={{ gap: 10 }}><Layers size={26} color="var(--plum-700)" /> طلب سريع بالجملة</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>ابحث بالاسم أو الـ SKU وأدخل الكميات مباشرة. الأسعار تتحدث حسب الكمية ونوع العميل.</p>
        </div>
        <button className="btn btn-outline" onClick={reorder}><RotateCcw size={16} /> إعادة طلب سابق</button>
      </div>

      <div className="bulk-layout">
        <div>
          <div className="bulk-search">
            <Search size={18} color="var(--ink-400)" />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المنتج أو SKU..." />
          </div>

          <div className="card bulk-table-wrap">
            <table className="tbl bulk-table">
              <thead><tr><th>المنتج</th><th>SKU</th><th>التغليف</th><th>المخزون</th><th>السعر</th><th>الكمية</th></tr></thead>
              <tbody>
                {products.map((p) => p.variants.map((v) => {
                  const qty = rows[v.id] || 0;
                  const pricing = resolveUnitPrice(data, v, p.id, Math.max(qty, v.moq), customer);
                  const belowMoq = qty > 0 && qty < v.moq;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="row" style={{ gap: 9 }}>
                          <img src={p.images[0]} alt="" className="bulk-thumb" />
                          <div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.nameAr}</div><div className="muted" style={{ fontSize: 11 }}>{v.nameAr}</div></div>
                        </div>
                      </td>
                      <td dir="ltr" className="muted" style={{ fontSize: 11 }}>{v.sku}</td>
                      <td><span className="badge badge-neutral" style={{ fontSize: 10 }}>{v.packSize} / عبوة</span><div className="muted" style={{ fontSize: 10, marginTop: 3 }}>حد أدنى {v.moq}</div></td>
                      <td className={v.stock < v.lowStockThreshold ? 'text-danger' : ''} style={{ fontSize: 12 }}>{v.stock}</td>
                      <td>
                        <strong style={{ color: 'var(--plum-700)', fontSize: 13 }}>{formatMoney(pricing.unitPrice)}</strong>
                        {pricing.source !== 'base' && <div className="muted row" style={{ gap: 3, fontSize: 9 }}><Tag size={9} /> {pricing.tierLabel}</div>}
                      </td>
                      <td>
                        <input className="input bulk-qty" type="number" min={0} value={qty || ''} placeholder="0" onChange={(e) => setQty(v.id, Number(e.target.value))} />
                        {belowMoq && <div className="text-danger" style={{ fontSize: 9, marginTop: 3 }}>أقل من الحد الأدنى</div>}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
            {!products.length && <div className="muted center" style={{ padding: 30 }}>لا توجد منتجات مطابقة.</div>}
          </div>
        </div>

        <aside className="card card-pad bulk-summary">
          <h3 className="row" style={{ fontSize: 17, marginBottom: 16 }}><ShoppingCart size={19} color="var(--plum-600)" /> ملخص الطلب</h3>
          {selected.length ? (
            <>
              <div className="bulk-lines">
                {selected.map((row) => {
                  const p = data.products.find((x) => x.id === row.productId)!;
                  const v = p.variants.find((x) => x.id === row.variantId)!;
                  const price = resolveUnitPrice(data, v, p.id, row.qty, customer).unitPrice;
                  return <div key={row.variantId} className="row-between" style={{ fontSize: 12, marginBottom: 9 }}><span className="truncate" style={{ maxWidth: 150 }}>{p.nameAr} × {row.qty}</span><strong>{formatMoney(price * row.qty)}</strong></div>;
                })}
              </div>
              <div style={{ borderTop: '1px dashed var(--line)', margin: '14px 0' }} />
              <div className="row-between" style={{ marginBottom: 6 }}><span className="muted">إجمالي الوحدات</span><strong>{totals.units}</strong></div>
              <div className="row-between" style={{ marginBottom: 16 }}><span className="muted">القيمة التقديرية</span><strong style={{ fontSize: 20, color: 'var(--plum-700)' }}>{formatMoney(totals.amount)}</strong></div>
              <button className="btn btn-primary btn-lg btn-block" onClick={addToCart}><CheckCircle2 size={17} /> أضف للسلة</button>
              <Link to="/store/cart" className="btn btn-outline btn-block" style={{ marginTop: 8 }}>عرض السلة <ArrowLeft size={15} /></Link>
            </>
          ) : (
            <div className="center muted" style={{ padding: '30px 0' }}><Package size={34} style={{ opacity: .4, marginBottom: 10 }} /><p style={{ fontSize: 13 }}>أدخل كميات لرؤية الملخص.</p></div>
          )}
          <p className="muted" style={{ fontSize: 10, marginTop: 16, lineHeight: 1.7 }}>الأسعار تقديرية للعرض فقط ويؤكدها فريق المبيعات. لا توجد عملية دفع داخل التطبيق.</p>
        </aside>
      </div>
    </div>
  );
}
