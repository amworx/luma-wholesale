import { Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart } from 'lucide-react';
import type { Product } from '@/types';
import { productMinPrice, formatMoney } from '@/data/store';
import { useCart } from '@/state/CartContext';
import { useFavorites } from '@/state/FavoritesContext';
import { useToast } from '@/components/ui/Toast';

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { has, toggle } = useFavorites();
  const toast = useToast();
  const favorite = has(product.id);
  const first = product.variants.find((v) => v.stock > 0) || product.variants[0];
  if (!first) return null;
  const hasSale = first.salePrice !== null;
  const minPrice = productMinPrice(product);
  const outOfStock = product.variants.every((v) => v.stock === 0);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    add(product.id, first.id, 1);
    toast.show('تمت إضافة المنتج إلى السلة', 'success');
  };

  return (
    <Link to={`/store/product/${product.id}`} className="product-card">
      <div className="product-img-wrap">
        <img src={product.images[0]} alt={product.nameAr} loading="lazy" />
        <div className="product-badges">
          {product.isNew && <span className="badge badge-info" style={{ fontSize: 10 }}>جديد</span>}
          {hasSale && <span className="badge badge-danger" style={{ fontSize: 10 }}>{Math.round((1 - first.salePrice! / first.retailPrice) * 100)}% خصم</span>}
          {outOfStock && <span className="badge badge-neutral" style={{ fontSize: 10 }}>نفد المخزون</span>}
        </div>
        <button className={`product-fav ${favorite ? 'is-active' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); const now = toggle(product.id); toast.show(now ? 'تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة', 'success'); }} aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>
        <button className="product-add" onClick={quickAdd} disabled={outOfStock} aria-label="أضف للسلة"><ShoppingBag size={18} /></button>
      </div>
      <div className="product-info">
        <div className="muted" style={{ fontSize: 11 }}>{product.brand}</div>
        <h3 className="truncate" style={{ fontSize: 14.5, fontWeight: 800, margin: '2px 0 6px' }}>{product.nameAr}</h3>
        <div className="row-between">
          <div className="row" style={{ gap: 6 }}>
            <span style={{ color: 'var(--plum-700)', fontWeight: 900, fontSize: 16 }}>{formatMoney(minPrice)}</span>
            {hasSale && <span className="muted" style={{ textDecoration: 'line-through', fontSize: 12 }}>{formatMoney(first.retailPrice)}</span>}
          </div>
          <span className="row" style={{ gap: 2, fontSize: 11, color: 'var(--ink-500)' }}><Star size={12} fill="var(--gold-500)" color="var(--gold-500)" />{product.rating}</span>
        </div>
      </div>
    </Link>
  );
}
