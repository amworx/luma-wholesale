import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  demandStats, mostSold, mostDemanded, trending, boughtTogether,
  productsInCategory, browsableChildren, newArrivals, topRated,
} from './recommendations';
import type { AppData, Product, Order, OrderStatus } from '@/types';

const product = (id: string, categoryId: string, rating = 4.5, createdAt = '2026-01-01T00:00:00.000Z'): Product => ({
  id, nameAr: id, nameEn: id, descriptionAr: '', shortDescriptionAr: '',
  categoryId, brand: 'b', tags: [], images: [], isFeatured: false, isNew: false,
  isActive: true, rating, reviewCount: 10, createdAt, updatedAt: createdAt,
  shipping: 'standard', shippingFee: 0, freeShippingOver: null,
  variants: [{ id: `v-${id}`, nameAr: 'v', sku: id, barcode: '', costPrice: 100, retailPrice: 200,
    salePrice: null, stock: 10, lowStockThreshold: 2, weightGrams: 10, packSize: 1, moq: 1 }],
});

const order = (id: string, lines: [string, number][], createdAt: string, status: OrderStatus = 'delivered'): Order => ({
  id, orderNumber: id, customerId: 'c1', customerName: 'n', customerPhone: 'p',
  lines: lines.map(([pid, qty]) => ({ productId: pid, variantId: `v-${pid}`, productNameAr: pid,
    variantNameAr: 'v', image: '', unitPrice: 200, quantity: qty, lineTotal: qty * 200,
    sku: pid, priceTier: 'default', currency: 'USD' })),
  subtotal: 0, shippingFee: 0, discount: 0, total: 0, status, paymentMethod: 'cod',
  address: {} as Order['address'], handledBy: '', handlingNotes: '', quotedTotal: null,
  handledAt: '', createdAt, updatedAt: createdAt, notes: '',
});

function data(products: Product[], orders: Order[], categories: AppData['categories'] = []): AppData {
  return { products, orders, categories } as AppData;
}

test('demandStats counts units, distinct orders and recency', () => {
  const d = data([product('a', 'c1'), product('b', 'c1')], [
    order('o1', [['a', 5], ['b', 2]], '2026-11-01T00:00:00.000Z'),
    order('o2', [['a', 3]], '2026-11-10T00:00:00.000Z'),
  ]);
  const s = demandStats(d, new Date('2026-11-15T00:00:00.000Z').getTime());
  assert.equal(s.units.get('a'), 8);
  assert.equal(s.orders.get('a'), 2);
  assert.ok(s.recent.get('a')! > s.recent.get('b')!);
});

test('cancelled and returned orders do not count as demand', () => {
  const d = data([product('a', 'c1')], [
    order('o1', [['a', 50]], '2026-11-01T00:00:00.000Z', 'cancelled'),
    order('o2', [['a', 2]], '2026-11-01T00:00:00.000Z', 'returned'),
  ]);
  const s = demandStats(d);
  assert.equal(s.units.get('a'), undefined);
  assert.equal(mostSold(d).length, 0); // no signal, no featured fallback
});

test('mostSold ranks by units, mostDemanded by order count', () => {
  const d = data([product('a', 'c1'), product('b', 'c1')], [
    order('o1', [['a', 20]], '2026-11-01T00:00:00.000Z'),
    order('o2', [['b', 2]], '2026-11-01T00:00:00.000Z'),
    order('o3', [['b', 2]], '2026-11-02T00:00:00.000Z'),
  ]);
  assert.equal(mostSold(d)[0].id, 'a');
  assert.equal(mostDemanded(d)[0].id, 'b');
});

test('boughtTogether uses co-purchase and excludes seed products', () => {
  const d = data([product('a', 'c1'), product('b', 'c1'), product('c', 'c2')], [
    order('o1', [['a', 1], ['b', 1], ['c', 1]], '2026-11-01T00:00:00.000Z'),
  ]);
  const rec = boughtTogether(d, ['a']);
  assert.deepEqual(rec.map((p) => p.id).sort(), ['b', 'c']);
  assert.ok(!rec.some((p) => p.id === 'a'));
});

test('boughtTogether falls back to same-category products when no history', () => {
  const d = data([product('a', 'c1'), product('b', 'c1'), product('c', 'c2')], []);
  const rec = boughtTogether(d, ['a']);
  assert.deepEqual(rec.map((p) => p.id), ['b']);
});

test('category scope covers unlimited sub-category depth', () => {
  const cats: AppData['categories'] = [
    { id: 'root', nameAr: 'r', nameEn: 'r', descriptionAr: '', icon: '', color: '', active: true, sortOrder: 1, parentId: null },
    { id: 'sub', nameAr: 's', nameEn: 's', descriptionAr: '', icon: '', color: '', active: true, sortOrder: 1, parentId: 'root' },
    { id: 'deep', nameAr: 'd', nameEn: 'd', descriptionAr: '', icon: '', color: '', active: true, sortOrder: 1, parentId: 'sub' },
  ];
  const d = data([product('p', 'deep'), product('q', 'other')], [], cats);
  assert.deepEqual(productsInCategory(d, 'root').map((p) => p.id), ['p']);
  const top = browsableChildren(d, null);
  assert.equal(top.length, 1);
  assert.equal(top[0].category.id, 'root');
  assert.equal(top[0].count, 1);
  assert.equal(top[0].hasChildren, true);
});

test('newArrivals sorts by date, topRated by rating', () => {
  const d = data([
    product('old', 'c1', 3, '2026-01-01T00:00:00.000Z'),
    product('new', 'c1', 5, '2026-11-01T00:00:00.000Z'),
  ], []);
  assert.equal(newArrivals(d)[0].id, 'new');
  assert.equal(topRated(d)[0].id, 'new');
});

test('trending weights recent orders above older ones', () => {
  const d = data([product('a', 'c1'), product('b', 'c1')], [
    order('o1', [['a', 1]], '2026-01-01T00:00:00.000Z'),
    order('o2', [['b', 1]], '2026-11-15T00:00:00.000Z'),
  ]);
  assert.equal(trending(d, 8, new Date('2026-11-16T00:00:00.000Z').getTime())[0].id, 'b');
});
