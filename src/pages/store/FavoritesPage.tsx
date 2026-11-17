import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useData } from '@/data/store';
import { ProductCard } from '@/components/store/ProductCard';
import { EmptyState } from '@/components/ui/Common';

const KEY = 'luma.favorites.v1';

export function FavoritesPage() {
  const data = useData();
  const [ids, setIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(ids)); }, [ids]);
  // Listen for favorites toggled from cards via custom event.
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    window.addEventListener('luma:favorite', handler);
    return () => window.removeEventListener('luma:favorite', handler);
  }, []);

  const products = data?.products.filter((p) => ids.includes(p.id)) || [];
  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>المفضلة</h1>
      {products.length ? <div className="products-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        : <EmptyState title="لا توجد منتجات مفضلة" description="اضغطي على القلب بجانب أي منتج لحفظه هنا." action={<Heart size={40} color="var(--ink-300)" />} />}
    </div>
  );
}
