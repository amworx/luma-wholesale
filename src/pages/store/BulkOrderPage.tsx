import { useMemo, useState, createElement } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  Search, ShoppingCart, Package, RotateCcw, Tag, ArrowLeft, CheckCircle2, Layers,
  Flame, TrendingUp, Star, Sparkles, Clock, ChevronLeft, ChevronDown, X, Home,
  Grid2X2, Plus, Minus, Users, AlertCircle,
} from 'lucide-react';
import { useData, formatMoney, topCategories, childCategoriesOf } from '@/data/store';
import { resolveUnitPrice, checkQuantity, isWholesaleEligible } from '@/data/pricing';
import {
  mostSold, mostDemanded, trending, newArrivals, topRated, featured,
  boughtTogether, productsInCategory, browsableChildren, hasSalesHistory,
} from '@/data/recommendations';
import { useCart } from '@/state/CartContext';
import { useSession } from '@/data/store';
import { useToast } from '@/components/ui/Toast';
import type { AppData, Category, Product, ProductVariant, User } from '@/types';

interface Row { productId: string; variantId: string; qty: number }

type View =
  | { kind: 'home' }
  | { kind: 'category'; id: string }
  | { kind: 'shelf'; key: ShelfKey }
  | { kind: 'results'; query: string };

type ShelfKey = 'mostSold' | 'mostDemanded' | 'trending' | 'new' | 'topRated' | 'featured' | 'pairing';

const iconFor = (name: string) =>
  (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] || Icons.Sparkles;

const SHELVES: { key: ShelfKey; title: string; sub: string; icon: React.ReactNode; tone: string }[] = [
  { key: 'mostSold', title: 'الأكثر مبيعاً', sub: 'ما طلبه التجار أكثر من غيره', icon: <Flame size={20} />, tone: '#c0392b' },
  { key: 'mostDemanded', title: 'الأكثر طلباً', sub: 'الأكثر تكراراً في الطلبات', icon: <Users size={20} />, tone: '#a85480' },
  { key: 'trending', title: 'الرائج الآن', sub: 'حركة المبيعات في الآونة الأخيرة', icon: <TrendingUp size={20} />, tone: '#2e8b57' },
  { key: 'new', title: 'وصل حديثاً', sub: 'أضيفت إلى الكتالوج مؤخراً', icon: <Clock size={20} />, tone: '#4d8ba3' },
  { key: 'topRated', title: 'الأعلى تقييماً', sub: 'أفضل المنتجات تقييماً', icon: <Star size={20} />, tone: '#c99a2c' },
  { key: 'featured', title: 'مختارة لك', sub: 'منتجات اختارها فريق المتجر', icon: <Sparkles size={20} />, tone: '#63468a' },
];

/**
 * Wholesale ordering with a discovery-first flow: browse the category tree,
 * open curated shelves, search by name/SKU, and get "bought together" ideas.
 * Every path feeds the same quick quantity grid and shared order summary.
 * All prices are demo reference data confirmed manually by the sales team.
 */
export function BulkOrderPage() {
  const data = useData();
  const session = useSession();
  const { addMany } = useCart();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>({ kind: 'home' });
  const [rows, setRows] = useState<Record<string, number>>({}); // variantId -> qty
  const [expanded, setExpanded] = useState<string | null>(null); // product id

  const customer = useMemo(
    () => (data && session ? data.users.find((u) => u.id === session.userId) || null : null),
    [data, session]
  );

  const shelves = useMemo(() => {
    if (!data) return {} as Record<ShelfKey, Product[]>;
    return {
      mostSold: mostSold(data), mostDemanded: mostDemanded(data), trending: trending(data),
      new: newArrivals(data), topRated: topRated(data), featured: featured(data),
      pairing: boughtTogether(data, selectedProductIds(rows, data)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, rows]);

  const results = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.products.filter((p) => p.isActive && (
      p.nameAr.includes(q) || p.nameEn.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(q))
    ));
  }, [data, query]);

  if (!data) return null;

  // Pending/rejected/suspended business accounts cannot use wholesale ordering.
  if (session?.role === 'customer' && !isWholesaleEligible(customer)) {
    return (
      <div className="container" style={{ padding: '60px 20px', maxWidth: 720 }}>
        <div className="card card-pad center" style={{ padding: 44 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--warning-bg)', color: 'var(--warning)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Layers size={36} /></div>
          <h2 style={{ fontSize: 22, marginBottom: 10 }}>الطلب بالجملة غير متاح حالياً</h2>
          <p className="muted" style={{ lineHeight: 1.9, marginBottom: 20 }}>
            {customer?.accountStatus === 'pending' && 'حسابك قيد المراجعة. سيتفعّل الطلب بالجملة بعد موافقة فريق المبيعات.'}
            {customer?.accountStatus === 'suspended' && 'حسابك موقوف مؤقتاً. تواصل مع فريق المبيعات.'}
            {customer?.accountStatus === 'rejected' && 'لم تتم الموافقة على حساب الجملة. تواصل مع فريق المبيعات.'}
            {!customer && 'سجّل الدخول بحساب عميل نشط لاستخدام الطلب بالجملة.'}
          </p>
          <Link to="/store/account" className="btn btn-primary">عرض حالة الحساب</Link>
        </div>
      </div>
    );
  }

  const setQty = (variantId: string, qty: number) => setRows((r) => ({ ...r, [variantId]: Math.max(0, qty) }));
  const nudge = (variantId: string, delta: number, pack: number) =>
    setRows((r) => ({ ...r, [variantId]: Math.max(0, (r[variantId] || 0) + delta * Math.max(1, pack)) }));

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

  // Detailed, actionable validation: name each variant and say exactly why its
  // quantity is wrong, with the concrete value that would fix it.
  const invalid = selected.flatMap((r) => {
    const p = data.products.find((x) => x.id === r.productId)!;
    const v = p.variants.find((x) => x.id === r.variantId)!;
    const qc = checkQuantity(v, r.qty);
    return qc.valid ? [] : [{ ...r, product: p, variant: v, reason: qc.messageAr, fix: qc.adjusted }];
  });
  const invalidCount = invalid.length;

  const addToCart = () => {
    if (!selected.length) { toast.show('أدخل كمية لمنتج واحد على الأقل', 'error'); return; }
    if (invalidCount) { toast.show(`اضبط ${invalidCount} كمية غير صالحة (حد أدنى / مضاعفات العبوة)`, 'error'); return; }
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

  const go = (v: View) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const viewProducts = view.kind === 'home' ? [] : view.kind === 'results' ? results
    : view.kind === 'category' ? productsInCategory(data, view.id) : shelves[view.key] || [];

  const viewTitle = view.kind === 'home' ? '' : view.kind === 'results' ? `نتائج البحث: ${view.query}`
    : view.kind === 'category' ? (data.categories.find((c) => c.id === view.id)?.nameAr || 'الفئة')
    : SHELVES.find((s) => s.key === view.key)?.title || '';

  const pairing = shelves.pairing;

  return (
    <div className="container bulk-page">
      <div className="bulk-head">
        <div>
          <h1 className="section-title row" style={{ gap: 10 }}><Layers size={26} color="var(--plum-700)" /> طلب بالجملة</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>تصفّح الفئات أو اختر من الأكثر مبيعاً، ثم أدخل الكميات. الأسعار تتحدث حسب الكمية ونوع الحساب.</p>
        </div>
        <button className="btn btn-outline" onClick={reorder}><RotateCcw size={16} /> إعادة طلب سابق</button>
      </div>

      {/* Always-visible search box */}
      <form className="bulk-search" onSubmit={(e) => { e.preventDefault(); go({ kind: 'results', query }); }}>
        <Search size={18} color="var(--ink-400)" />
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المنتج، الماركة، أو SKU..." aria-label="بحث" />
        {query && <button type="button" className="btn-icon-soft" onClick={() => { setQuery(''); if (view.kind === 'results') go({ kind: 'home' }); }} aria-label="مسح"><X size={15} /></button>}
        <button type="submit" className="btn btn-primary btn-sm">بحث</button>
      </form>

      {/* Breadcrumb for any non-home view */}
      {view.kind !== 'home' && (
        <div className="bulk-crumb">
          <button onClick={() => go({ kind: 'home' })}><Home size={14} /> الرئيسية</button>
          <ChevronLeft size={13} />
          <span>{viewTitle}</span>
        </div>
      )}

      <div className="bulk-layout">
        <div className="bulk-main">
          {view.kind === 'home' && (
            <>
              <section className="bulk-section">
                <h2 className="bulk-section-title"><Grid2X2 size={18} /> تصفّح حسب الفئة</h2>
                <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>اختر فئة لتظهر منتجاتها، ويمكنك الدخول إلى الفئات الفرعية.</p>
                <div className="bulk-cat-grid">
                  {topCategories(data).map((c) => {
                    const kids = childCategoriesOf(data, c.id);
                    const count = productsInCategory(data, c.id).length;
                    return (
                      <button key={c.id} className="bulk-cat" onClick={() => go({ kind: 'category', id: c.id })}>
                        <span className="bulk-cat-ico" style={{ background: `${c.color}1a`, color: c.color }}>
                          {createElement(iconFor(c.icon), { size: 22 })}
                        </span>
                        <span className="bulk-cat-text"><strong>{c.nameAr}</strong><small>{count} منتج{kids.length ? ` · ${kids.length} فئات فرعية` : ''}</small></span>
                        <ChevronLeft size={15} className="bulk-cat-arrow" />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="bulk-section">
                <h2 className="bulk-section-title"><Sparkles size={18} /> اختيارات قد تعجبك</h2>
                <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>أكثر ما طلبه التجار، وأحدث ما وصل إلى المتجر.</p>
                <div className="bulk-shelf-grid">
                  {SHELVES.map((s) => (
                    <button key={s.key} className="bulk-shelf-card" onClick={() => go({ kind: 'shelf', key: s.key })} style={{ borderTopColor: s.tone }}>
                      <span className="bulk-shelf-ico" style={{ background: `${s.tone}18`, color: s.tone }}>{s.icon}</span>
                      <strong>{s.title}</strong>
                      <small>{s.sub}</small>
                      <span className="bulk-shelf-count">{shelves[s.key]?.length || 0} منتج <ChevronLeft size={13} /></span>
                    </button>
                  ))}
                </div>
              </section>

              {pairing.length > 0 && (
                <ProductShelf title="يُطلب مع ما اخترته" sub="منتجات طلبها تجار آخرون مع أصناف في طلبك" products={pairing} data={data} customer={customer} rows={rows} setQty={setQty} nudge={nudge} expanded={expanded} setExpanded={setExpanded} />
              )}
            </>
          )}

          {view.kind === 'category' && (
            <>
              <CategoryDrill data={data} categoryId={view.id} onPick={(id) => go({ kind: 'category', id })} />
              <h2 className="bulk-section-title" style={{ marginTop: 8 }}>{viewTitle} <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>({viewProducts.length} منتج)</span></h2>
              {viewProducts.length ? <ProductGrid products={viewProducts} data={data} customer={customer} rows={rows} setQty={setQty} nudge={nudge} expanded={expanded} setExpanded={setExpanded} /> : <EmptyBrowse onHome={() => go({ kind: 'home' })} />}
            </>
          )}

          {(view.kind === 'shelf' || view.kind === 'results') && (
            <>
              <h2 className="bulk-section-title">{viewTitle} <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>({viewProducts.length} منتج)</span></h2>
              {view.kind === 'shelf' && !hasSalesHistory(data) && ['mostSold', 'mostDemanded', 'trending'].includes(view.key) && (
                <div className="bulk-note"><Sparkles size={15} /> لا توجد بيانات مبيعات كافية بعد؛ نعرض منتجات مختارة وذات تقييم عالٍ بدلاً منها.</div>
              )}
              {viewProducts.length ? <ProductGrid products={viewProducts} data={data} customer={customer} rows={rows} setQty={setQty} nudge={nudge} expanded={expanded} setExpanded={setExpanded} /> : <EmptyBrowse onHome={() => go({ kind: 'home' })} />}
            </>
          )}
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
              {invalidCount > 0 && (
                <div className="bulk-issues">
                  <div className="bulk-issues-head"><AlertCircle size={16} /> يرجى ضبط {invalidCount} {invalidCount === 1 ? 'كمية' : 'كميات'} قبل الإضافة للسلة</div>
                  <div className="bulk-issues-list">
                    {invalid.map((it) => (
                      <div key={it.variantId} className="bulk-issue">
                        <div className="bulk-issue-text">
                          <strong>{it.product.nameAr} <span className="muted">· {it.variant.nameAr}</span></strong>
                          <span className="text-danger">{it.reason} — أدخلت {it.qty}</span>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => setQty(it.variantId, it.fix)}>اضبط إلى {it.fix}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

function selectedProductIds(rows: Record<string, number>, data: AppData): string[] {
  const ids = new Set<string>();
  for (const [variantId, qty] of Object.entries(rows)) {
    if (qty <= 0) continue;
    const p = data.products.find((x) => x.variants.some((v) => v.id === variantId));
    if (p) ids.add(p.id);
  }
  return [...ids];
}

function EmptyBrowse({ onHome }: { onHome: () => void }) {
  return <div className="card card-pad center" style={{ padding: 44 }}>
    <Package size={36} style={{ opacity: .4, marginBottom: 12 }} />
    <h3 style={{ fontSize: 16, marginBottom: 8 }}>لا توجد منتجات هنا</h3>
    <button className="btn btn-primary btn-sm" onClick={onHome}>العودة للرئيسية</button>
  </div>;
}

function CategoryDrill({ data, categoryId, onPick }: { data: AppData; categoryId: string; onPick: (id: string) => void }) {
  const chain: Category[] = [];
  let cur = data.categories.find((c) => c.id === categoryId);
  while (cur) { chain.unshift(cur); cur = cur.parentId ? data.categories.find((c) => c.id === cur!.parentId) : undefined; }
  const kids = browsableChildren(data, categoryId);
  return (
    <div className="bulk-drill">
      <div className="bulk-drill-chain">
        {chain.map((c, i) => <span key={c.id}>
          {i > 0 && <ChevronLeft size={13} />}
          <button className={i === chain.length - 1 ? 'active' : ''} onClick={() => onPick(c.id)}>{c.nameAr}</button>
        </span>)}
      </div>
      {kids.length > 0 && (
        <div className="bulk-drill-kids">
          {kids.map(({ category, count, hasChildren }) => (
            <button key={category.id} onClick={() => onPick(category.id)}>
              {createElement(iconFor(category.icon), { size: 16 })}
              <span>{category.nameAr}</span>
              <small>{count ? `${count} منتج` : hasChildren ? 'فئات فرعية' : ''}</small>
              <ChevronLeft size={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface GridProps {
  products: Product[];
  data: AppData;
  customer: User | null;
  rows: Record<string, number>;
  setQty: (id: string, qty: number) => void;
  nudge: (id: string, delta: number, pack: number) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}

function ProductGrid(props: GridProps) {
  return <div className="bulk-product-grid">{props.products.map((p) => (
    <ProductCard key={p.id} product={p} {...props} />
  ))}</div>;
}

function ProductShelf({ title, sub, products, ...rest }: GridProps & { title: string; sub: string; products: Product[] }) {
  return <section className="bulk-section">
    <h2 className="bulk-section-title"><Sparkles size={18} /> {title}</h2>
    <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>{sub}</p>
    <div className="bulk-product-grid">{products.map((p) => <ProductCard key={p.id} product={p} {...rest} />)}</div>
  </section>;
}

function ProductCard({ product, data, customer, rows, setQty, nudge, expanded, setExpanded }: Omit<GridProps, 'products'> & { product: Product }) {
  const isOpen = expanded === product.id;
  const inCart = product.variants.reduce((s, v) => s + (rows[v.id] || 0), 0);
  const minPrice = Math.min(...product.variants.map((v) => resolveUnitPrice(data, v, product.id, v.moq, customer).unitPrice));
  return (
    <div className={`bulk-product ${inCart > 0 ? 'has-qty' : ''}`}>
      <button className="bulk-product-top" onClick={() => setExpanded(isOpen ? null : product.id)}>
        <div className="bulk-product-img">
          <img src={product.images[0]} alt="" loading="lazy" />
          {product.isNew && <span className="bulk-flag">جديد</span>}
          {inCart > 0 && <span className="bulk-qty-flag">{inCart}</span>}
        </div>
        <div className="bulk-product-info">
          <strong>{product.nameAr}</strong>
          <span className="muted">{product.brand}</span>
          <span className="bulk-product-price">من {formatMoney(minPrice)}</span>
          <span className="muted" style={{ fontSize: 10 }}><Star size={10} fill="currentColor" /> {product.rating} · {product.variants.length} خيار</span>
        </div>
        <ChevronDown size={16} className={`bulk-product-chev ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <div className="bulk-variants">
          {product.variants.map((v) => <VariantRow key={v.id} product={product} variant={v} data={data} customer={customer} rows={rows} setQty={setQty} nudge={nudge} />)}
        </div>
      )}
    </div>
  );
}

function VariantRow({ product, variant, data, customer, rows, setQty, nudge }: {
  product: Product; variant: ProductVariant; data: AppData;
  customer: GridProps['customer']; rows: Record<string, number>;
  setQty: (id: string, qty: number) => void; nudge: (id: string, delta: number, pack: number) => void;
}) {
  const qty = rows[variant.id] || 0;
  const pricing = resolveUnitPrice(data, variant, product.id, Math.max(qty, variant.moq), customer);
  const qc = qty > 0 ? checkQuantity(variant, qty) : null;
  return (
    <div className="bulk-variant">
      <div className="bulk-variant-head">
        <div><strong style={{ fontSize: 12 }}>{variant.nameAr}</strong><span dir="ltr" className="muted" style={{ fontSize: 10, marginInlineStart: 6 }}>{variant.sku}</span></div>
        <div className="row" style={{ gap: 6 }}>
          <strong style={{ color: 'var(--plum-700)', fontSize: 13 }}>{formatMoney(pricing.unitPrice)}</strong>
          {pricing.source !== 'base' && <span className="badge badge-neutral" style={{ fontSize: 9 }}><Tag size={9} /> {pricing.tierLabel}</span>}
        </div>
      </div>
      <div className="bulk-variant-meta">
        <span>{variant.packSize} / عبوة · حد أدنى {variant.moq}</span>
        <span className={variant.stock < variant.lowStockThreshold ? 'text-danger' : ''}>المخزون: {variant.stock}</span>
      </div>
      <div className="bulk-stepper">
        <button onClick={() => nudge(variant.id, -1, variant.packSize)} aria-label="إنقاص"><Minus size={14} /></button>
        <input className="input bulk-qty" type="number" min={0} value={qty || ''} placeholder="0" onChange={(e) => setQty(variant.id, Number(e.target.value))} aria-label="الكمية" />
        <button onClick={() => nudge(variant.id, 1, variant.packSize)} aria-label="زيادة"><Plus size={14} /></button>
      </div>
      {qc && !qc.valid && <div className="text-danger" style={{ fontSize: 10, marginTop: 4 }}>{qc.messageAr}</div>}
    </div>
  );
}
