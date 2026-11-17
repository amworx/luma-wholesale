import { Heart } from 'lucide-react';
import { useData } from '@/data/store';
import { useFavorites } from '@/state/FavoritesContext';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Common';

export function FavoritesPage() {
  const data = useData();
  const { ids } = useFavorites();
  const products = data?.products.filter((p) => ids.includes(p.id)) || [];
  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>المفضلة</h1>
      {products.length ? <div className="products-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        : <EmptyState title="لا توجد منتجات مفضلة" description="اضغط على القلب بجانب أي منتج لحفظه هنا." action={<Heart size={40} color="var(--ink-300)" />} />}
    </div>
  );
}
