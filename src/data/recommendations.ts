import type { AppData, Product } from '@/types';

/** Local copy of the category subtree walk, kept here so this module stays
 *  pure and testable without loading the browser-only store module. */
function categorySubtreeIds(data: AppData, id: string): string[] {
  const out = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of data.categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) { out.add(c.id); changed = true; }
    }
  }
  return [...out];
}

/**
 * Discovery signals for the wholesale ordering page, derived from data the
 * demo already has: order history, categories, ratings and product flags.
 *
 * These are reference/demo signals, not a real analytics service. With a thin
 * order history the order-based shelves fall back to featured/top-rated items
 * so a new client never sees an empty shop.
 */

const active = (data: AppData) => data.products.filter((p) => p.isActive && p.variants.length > 0);

export interface DemandStats {
  units: Map<string, number>;   // productId -> total units sold
  orders: Map<string, number>;  // productId -> distinct orders containing it
  recent: Map<string, number>;  // productId -> recency-weighted score
}

/** Count sales signals from completed orders. Cancelled/returned are excluded. */
export function demandStats(data: AppData, asOf = Date.now()): DemandStats {
  const units = new Map<string, number>();
  const orders = new Map<string, number>();
  const recent = new Map<string, number>();
  for (const o of data.orders) {
    if (o.status === 'cancelled' || o.status === 'returned') continue;
    const seen = new Set<string>();
    const ageDays = Math.max(0, (asOf - new Date(o.createdAt).getTime()) / 86_400_000);
    const weight = Math.max(0, 1 - ageDays / 90);
    for (const l of o.lines) {
      units.set(l.productId, (units.get(l.productId) || 0) + l.quantity);
      if (!seen.has(l.productId)) {
        seen.add(l.productId);
        orders.set(l.productId, (orders.get(l.productId) || 0) + 1);
        recent.set(l.productId, (recent.get(l.productId) || 0) + weight);
      }
    }
  }
  return { units, orders, recent };
}

export function hasSalesHistory(data: AppData): boolean {
  return data.orders.some((o) => o.status !== 'cancelled' && o.status !== 'returned' && o.lines.length > 0);
}

const byRating = (a: Product, b: Product) => b.rating - a.rating || b.reviewCount - a.reviewCount;
const fallback = (data: AppData, limit: number): Product[] =>
  active(data).filter((p) => p.isFeatured).sort(byRating).slice(0, limit);

function rankBy(data: AppData, score: (p: Product) => number, limit: number): Product[] {
  const pool = active(data);
  if (!pool.length) return [];
  const ranked = [...pool].sort((a, b) => score(b) - score(a) || byRating(a, b));
  // Only surface products with a real signal; otherwise use curated fallback.
  const withSignal = ranked.filter((p) => score(p) > 0);
  return (withSignal.length ? withSignal : fallback(data, limit)).slice(0, limit);
}

/** أعلى المنتجات مبيعاً بالوحدات عبر الطلبات المسجلة. */
export const mostSold = (data: AppData, limit = 8): Product[] => {
  const s = demandStats(data);
  return rankBy(data, (p) => s.units.get(p.id) || 0, limit);
};

/** المنتجات التى طلبها أكبر عدد من العملاء (تكرار الظهور في الطلبات). */
export const mostDemanded = (data: AppData, limit = 8): Product[] => {
  const s = demandStats(data);
  return rankBy(data, (p) => s.orders.get(p.id) || 0, limit);
};

/** الأكثر رواجاً مؤخراً: الطلبات الأحدث تُرجّح أكثر. */
export const trending = (data: AppData, limit = 8, asOf = Date.now()): Product[] => {
  const s = demandStats(data, asOf);
  return rankBy(data, (p) => s.recent.get(p.id) || 0, limit);
};

/** وصل حديثاً. */
export const newArrivals = (data: AppData, limit = 8): Product[] =>
  [...active(data)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

/** الأعلى تقييماً. */
export const topRated = (data: AppData, limit = 8): Product[] =>
  [...active(data)].sort(byRating).slice(0, limit);

/** منتجات مختارة (التي علّمها المدير كمميزة). */
export const featured = (data: AppData, limit = 8): Product[] => fallback(data, limit);

/**
 * "العملاء الذين طلبوا هذا المنتج طلبوا أيضاً..."
 * Co-occurrence across orders, excluding the products already selected.
 */
export function boughtTogether(data: AppData, productIds: string[], limit = 6): Product[] {
  const seeds = new Set(productIds);
  if (!seeds.size) return [];
  const score = new Map<string, number>();
  for (const o of data.orders) {
    if (o.status === 'cancelled' || o.status === 'returned') continue;
    const ids = [...new Set(o.lines.map((l) => l.productId))];
    if (!ids.some((id) => seeds.has(id))) continue;
    for (const id of ids) {
      if (seeds.has(id)) continue;
      score.set(id, (score.get(id) || 0) + 1);
    }
  }
  const ranked = active(data)
    .filter((p) => (score.get(p.id) || 0) > 0)
    .sort((a, b) => (score.get(b.id) || 0) - (score.get(a.id) || 0) || byRating(a, b));
  if (ranked.length) return ranked.slice(0, limit);

  // No co-purchase history yet: suggest other products from the same category.
  const seedCats = new Set(
    active(data).filter((p) => seeds.has(p.id)).map((p) => p.categoryId)
  );
  return active(data)
    .filter((p) => !seeds.has(p.id) && seedCats.has(p.categoryId))
    .sort(byRating)
    .slice(0, limit);
}

/** Products in a category subtree (handles unlimited sub-category depth). */
export const productsInCategory = (data: AppData, categoryId: string): Product[] => {
  const ids = new Set(categorySubtreeIds(data, categoryId));
  return active(data).filter((p) => ids.has(p.categoryId));
};

/** Direct child categories that actually contain products (for drill-down tiles). */
export function browsableChildren(data: AppData, parentId: string | null) {
  return data.categories
    .filter((c) => c.active && c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      category: c,
      count: productsInCategory(data, c.id).length,
      hasChildren: data.categories.some((x) => x.active && x.parentId === c.id),
    }))
    .filter((x) => x.count > 0 || x.hasChildren);
}
