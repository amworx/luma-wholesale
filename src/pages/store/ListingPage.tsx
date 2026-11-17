import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { useData, productMinPrice, formatMoney, categoryProductScope } from '@/data/store';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Common';
import type { Product } from '@/types';

export function ListingPage({ variant }: { variant: 'all' | 'category' | 'search' | 'offers' }) {
  const data = useData();
  const { categoryId } = useParams();
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();

  const [sort, setSort] = useState('featured');
  const [maxPrice, setMaxPrice] = useState(1000);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const category = data?.categories.find((c) => c.id === categoryId);

  // If we're on a subcategory page, browse it as its parent so the sibling
  // subcategory chips and product scope make sense.
  const parentCategory = useMemo(
    () => (data && categoryId ? data.categories.find((c) => c.id === categoryId) : undefined),
    [data, categoryId]
  );
  const browseId = parentCategory?.parentId ?? categoryId ?? '';

  const childCategories = useMemo(
    () => (data && variant === 'category'
      ? data.categories.filter((c) => c.parentId === browseId && c.active).sort((a, b) => a.sortOrder - b.sortOrder)
      : []),
    [data, variant, browseId]
  );

  // On a subcategory page, preselect that subcategory. Ignore a stale
  // selection left over from another category.
  const activeSubId = childCategories.some((c) => c.id === (selectedSubId ?? (parentCategory?.parentId ? categoryId : null)))
    ? (selectedSubId ?? (parentCategory?.parentId ? categoryId : null))
    : null;

  const { products, brands } = useMemo<{ products: Product[]; brands: string[] }>(() => {
    if (!data) return { products: [], brands: [] };

    let list = data.products.filter((p) => p.isActive);

    if (variant === 'category' && data) {
      const scope = new Set(categoryProductScope(data, browseId));
      list = list.filter((p) => scope.has(p.categoryId));
    }
    if (variant === 'offers') list = list.filter((p) => p.variants.some((v) => v.salePrice !== null));
    if (variant === 'search' && query) {
      const q = query.toLowerCase();
      list = list.filter((p) =>
        p.nameAr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)) ||
        data.categories.find((c) => c.id === p.categoryId)?.nameAr.includes(q)
      );
    }

    // Subcategory chips: use direct assignments when present, otherwise fall back
    // to the parent category's products (seed products use parent ids).
    if (variant === 'category' && activeSubId) {
      const direct = list.filter((p) => p.categoryId === activeSubId);
      list = direct.length ? direct : list.filter((p) => p.categoryId === categoryId);
    }

    list = list.filter((p) => productMinPrice(p) / 100 <= maxPrice);
    if (onlyAvailable) list = list.filter((p) => p.variants.some((v) => v.stock > 0));

    // Brand options reflect everything except the brand selection itself.
    const brandSet = new Set<string>();
    list.forEach((p) => brandSet.add(p.brand));
    const brandList = [...brandSet].sort((a, b) => a.localeCompare(b, 'ar'));

    if (selectedBrands.length) list = list.filter((p) => selectedBrands.includes(p.brand));

    switch (sort) {
      case 'price-asc': list = [...list].sort((a, b) => productMinPrice(a) - productMinPrice(b)); break;
      case 'price-desc': list = [...list].sort((a, b) => productMinPrice(b) - productMinPrice(a)); break;
      case 'rating': list = [...list].sort((a, b) => b.rating - a.rating); break;
      case 'newest': list = [...list].sort((a, b) => Number(b.isNew) - Number(a.isNew)); break;
      default: list = [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }
    return { products: list, brands: brandList };
  }, [data, variant, categoryId, query, childCategories, activeSubId, sort, maxPrice, onlyAvailable, selectedBrands]);

  const resetFilters = () => {
    setMaxPrice(1000);
    setOnlyAvailable(false);
    setSelectedBrands([]);
    setShowAllBrands(false);
    setSelectedSubId(null);
    setSort('featured');
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  };

  const visibleBrands = showAllBrands ? brands : brands.slice(0, 8);
  const activeFilterCount = (maxPrice < 1000 ? 1 : 0) + (onlyAvailable ? 1 : 0) + selectedBrands.length + (activeSubId ? 1 : 0);

  const title = variant === 'category' ? (category?.nameAr || 'المنتجات')
    : variant === 'search' ? `نتائج البحث عن «${query}»`
    : variant === 'offers' ? 'العروض والخصومات' : 'كل المنتجات';

  const sortSelect = (
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
  );

  const subcategoryChips = childCategories.length > 0 ? (
    <div className="lf-subrow" role="group" aria-label="الفئات الفرعية">
      <button type="button" className={`lf-chip ${activeSubId === null ? 'is-active' : ''}`} onClick={() => setSelectedSubId(null)}>الكل</button>
      {childCategories.map((c) => (
        <button
          type="button"
          key={c.id}
          className={`lf-chip ${activeSubId === c.id ? 'is-active' : ''}`}
          onClick={() => setSelectedSubId(c.id)}
        >
          {c.nameAr}
        </button>
      ))}
    </div>
  ) : null;

  const filterPanel = (
    <section className="lf-panel card" aria-label="تصفية النتائج">
      <div className="lf-head">
        <div className="lf-head-title"><SlidersHorizontal size={18} /><strong>تصفية النتائج</strong></div>
        <button type="button" className="lf-clear" onClick={resetFilters}>مسح الكل</button>
      </div>

      <div className="lf-group">
        <div className="lf-group-head">
          <span>السعر الأقصى</span>
          <span className="lf-value">{maxPrice >= 1000 ? 'بدون حد' : formatMoney(maxPrice * 100)}</span>
        </div>
        <input
          className="lf-range"
          type="range"
          min={50}
          max={1000}
          step={10}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          aria-label="السعر الأقصى"
        />
        <div className="lf-range-ends muted"><span>{formatMoney(5000)}</span><span>{formatMoney(100000)}</span></div>
      </div>

      <div className="lf-group lf-available">
        <span>المتوفر فقط</span>
        <button
          type="button"
          role="switch"
          aria-checked={onlyAvailable}
          aria-label="المتوفر فقط"
          className={`lf-switch ${onlyAvailable ? 'is-on' : ''}`}
          onClick={() => setOnlyAvailable((v) => !v)}
        >
          <span className="lf-switch-knob" />
        </button>
      </div>

      {subcategoryChips && (
        <div className="lf-group">
          <div className="lf-group-head"><span>الفئة الفرعية</span></div>
          {subcategoryChips}
        </div>
      )}

      <div className="lf-group">
        <div className="lf-group-head">
          <span>العلامة التجارية</span>
          {selectedBrands.length > 0 && <span className="lf-count">{selectedBrands.length}</span>}
        </div>
        {brands.length ? (
          <div className="lf-brands">
            {visibleBrands.map((brand) => (
              <label className="lf-brand" key={brand}>
                <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} />
                <span>{brand}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 12 }}>لا توجد علامات تجارية</p>
        )}
        {brands.length > 8 && (
          <button type="button" className="lf-more" onClick={() => setShowAllBrands((v) => !v)}>
            {showAllBrands ? 'عرض أقل' : `عرض المزيد (${brands.length - 8})`}
          </button>
        )}
      </div>

      <div className="lf-group">{sortSelect}</div>
    </section>
  );

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <span className="eyebrow">{variant === 'offers' ? 'أسعار أقل' : 'متجر لُما'}</span>
        <h1 className="section-title">{title}</h1>
        {variant === 'category' && category && <p className="muted" style={{ marginTop: 6 }}>{category.descriptionAr}</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{products.length} منتج</p>
      </div>

      <div className="listing-layout">
        <aside className="lf-desktop">{filterPanel}</aside>

        <div className="lf-content">
          <div className="lf-mobile-bar">
            <button type="button" className="btn btn-outline lf-filter-btn" onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal size={18} />
              <span>تصفية النتائج</span>
              {activeFilterCount > 0 && <span className="lf-count">{activeFilterCount}</span>}
            </button>
          </div>

          <div className="mobile-sort">
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">ترتيب: المميزة</option>
              <option value="newest">الأحدث</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>

          {subcategoryChips && <div className="lf-subbar">{subcategoryChips}</div>}

          {products.length ? (
            <div className="products-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          ) : (
            <EmptyState
              title="لا توجد منتجات مطابقة"
              description="جرّب تغيير الفلاتر أو البحث بكلمات أخرى."
              action={activeSubId ? (
                <button type="button" className="lf-chip is-active" onClick={() => setSelectedSubId(null)}>عرض الكل</button>
              ) : (
                <Search size={40} color="var(--ink-300)" />
              )}
            />
          )}
        </div>
      </div>

      {sheetOpen && (
        <div className="lf-overlay" onClick={() => setSheetOpen(false)}>
          <div
            className="lf-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="تصفية النتائج"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lf-sheet-head">
              <strong>تصفية النتائج</strong>
              <button type="button" className="btn-icon" aria-label="إغلاق" onClick={() => setSheetOpen(false)}><X size={20} /></button>
            </div>
            <div className="lf-sheet-body">{filterPanel}</div>
            <div className="lf-sheet-foot">
              <button type="button" className="btn btn-primary btn-block" onClick={() => setSheetOpen(false)}>
                عرض {products.length} منتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
