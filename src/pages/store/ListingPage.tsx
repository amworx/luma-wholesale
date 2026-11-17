import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search } from 'lucide-react';
import { useData, productMinPrice, formatMoney } from '@/data/store';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Common';

export function ListingPage({ variant }: { variant: 'all' | 'category' | 'search' | 'offers' }) {
  const data = useData();
  const { categoryId } = useParams();
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const [sort, setSort] = useState('featured');
  const [maxPrice, setMaxPrice] = useState(1000);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const category = data?.categories.find((c) => c.id === categoryId);

  const products = useMemo(() => {
    if (!data) return [];
    let list = data.products.filter((p) => p.isActive);
    if (variant === 'category') list = list.filter((p) => p.categoryId === categoryId);
    if (variant === 'offers') list = list.filter((p) => p.variants.some((v) => v.salePrice !== null));
    if (variant === 'search' && query) {
      const q = query.toLowerCase();
      list = list.filter((p) =>
        p.nameAr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)) ||
        data.categories.find((c) => c.id === p.categoryId)?.nameAr.includes(q)
      );
    }
    list = list.filter((p) => productMinPrice(p) / 100 <= maxPrice);
    if (onlyAvailable) list = list.filter((p) => p.variants.some((v) => v.stock > 0));
    switch (sort) {
      case 'price-asc': list = [...list].sort((a, b) => productMinPrice(a) - productMinPrice(b)); break;
      case 'price-desc': list = [...list].sort((a, b) => productMinPrice(b) - productMinPrice(a)); break;
      case 'rating': list = [...list].sort((a, b) => b.rating - a.rating); break;
      case 'newest': list = [...list].sort((a, b) => Number(b.isNew) - Number(a.isNew)); break;
      default: list = [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }
    return list;
  }, [data, variant, categoryId, query, sort, maxPrice, onlyAvailable]);

  const title = variant === 'category' ? (category?.nameAr || 'المنتجات')
    : variant === 'search' ? `نتائج البحث عن «${query}»`
    : variant === 'offers' ? 'العروض والخصومات' : 'كل المنتجات';

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <span className="eyebrow">{variant === 'offers' ? 'أسعار أقل' : 'متجر لُما'}</span>
        <h1 className="section-title">{title}</h1>
        {variant === 'category' && category && <p className="muted" style={{ marginTop: 6 }}>{category.descriptionAr}</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{products.length} منتج</p>
      </div>

      <div className="listing-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 26, alignItems: 'start' }}>
        {/* Filters */}
        <aside className="card card-pad listing-filters" style={{ position: 'sticky', top: 84 }}>
          <div className="row" style={{ marginBottom: 18 }}><SlidersHorizontal size={18} /><strong>تصفية النتائج</strong></div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>السعر الأقصى: {formatMoney(maxPrice * 100)}</label>
            <input type="range" min={50} max={1000} step={10} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} style={{ accentColor: 'var(--plum-700)', width: '100%' }} />
          </div>
          <label className="row" style={{ fontSize: 13, cursor: 'pointer', marginBottom: 18 }}>
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} style={{ accentColor: 'var(--plum-700)' }} />
            المتوفر فقط
          </label>
          <div className="field">
            <label>ترتيب حسب</label>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">المميزة</option>
              <option value="newest">الأحدث</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>
        </aside>

        <div>
          {/* Mobile sort */}
          <div className="mobile-sort">
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">ترتيب: المميزة</option>
              <option value="newest">الأحدث</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>
          {products.length ? (
            <div className="products-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          ) : (
            <EmptyState title="لا توجد منتجات مطابقة" description="جرّب تغيير الفلاتر أو البحث بكلمات أخرى." action={<Search size={40} color="var(--ink-300)" />} />
          )}
        </div>
      </div>
    </div>
  );
}
