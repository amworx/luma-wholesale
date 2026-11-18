import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveUnitPrice, resolveSubtotal } from './pricing';
import type { AppData, PriceRule, ProductVariant, User, CustomerGroup } from '@/types';

const variant: ProductVariant = {
  id: 'v1', nameAr: 'أحمر', sku: 'LM-01', barcode: '619', costPrice: 500, retailPrice: 1200,
  salePrice: 1000, stock: 100, lowStockThreshold: 5, weightGrams: 60, packSize: 12, moq: 6,
};

const group: CustomerGroup = { id: 'g1', nameAr: 'تجار الجملة', descriptionAr: '', active: true };
const customer: User = {
  id: 'u1', name: 'رنا', email: 'r@x.sy', password: 'x', role: 'customer', active: true,
  createdAt: '2026-01-01', avatarColor: '#000', customerGroupId: 'g1', accountStatus: 'active', companyName: '',
};
const rule = (over: Partial<PriceRule>): PriceRule => ({
  id: 'r', scope: 'default', scopeId: null, productId: null, variantId: null, minQty: 1,
  price: null, discountPct: 0, validFrom: null, validTo: null, active: true, noteAr: '', ...over,
});
const data = (rules: PriceRule[]) => ({ users: [customer], customerGroups: [group], priceRules: rules });

test('no rules falls back to sale price', () => {
  const r = resolveUnitPrice(data([]), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 1000);
  assert.equal(r.source, 'base');
});

test('default discount applies off sale price', () => {
  const r = resolveUnitPrice(data([rule({ discountPct: 10 })]), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 900); // 1000 * 0.9
  assert.equal(r.source, 'default');
});

test('group price overrides default', () => {
  const rules = [rule({ discountPct: 10 }), rule({ id: 'g', scope: 'group', scopeId: 'g1', discountPct: 20 })];
  const r = resolveUnitPrice(data(rules), variant, 'p1', 1, customer);
  assert.equal(r.unitPrice, 800);
  assert.equal(r.source, 'group');
});

test('customer price overrides group and default', () => {
  const rules = [
    rule({ discountPct: 10 }),
    rule({ id: 'g', scope: 'group', scopeId: 'g1', discountPct: 20 }),
    rule({ id: 'c', scope: 'customer', scopeId: 'u1', price: 700 }),
  ];
  const r = resolveUnitPrice(data(rules), variant, 'p1', 1, customer);
  assert.equal(r.unitPrice, 700);
  assert.equal(r.source, 'customer');
});

test('customer tier is ignored for guests', () => {
  const rules = [rule({ id: 'c', scope: 'customer', scopeId: 'u1', price: 700 })];
  const r = resolveUnitPrice(data(rules), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 1000);
  assert.equal(r.source, 'base');
});

test('higher minQty tier wins when quantity qualifies', () => {
  const rules = [rule({ discountPct: 10 }), rule({ id: 'tier', price: 750, minQty: 12 })];
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 6, null).unitPrice, 900);
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 12, null).unitPrice, 750);
});

test('variant-specific rule beats product-wide rule', () => {
  const rules = [
    rule({ id: 'prod', productId: 'p1', price: 800 }),
    rule({ id: 'var', productId: 'p1', variantId: 'v1', price: 700 }),
  ];
  const r = resolveUnitPrice(data(rules), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 700);
});

test('effective dates are inclusive and enforced', () => {
  const rules = [rule({ price: 500, validFrom: '2026-01-01', validTo: '2026-12-31' })];
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 1, null, '2026-06-01').unitPrice, 500);
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 1, null, '2026-01-01').unitPrice, 500);
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 1, null, '2027-01-01').unitPrice, 1000);
});

test('inactive rules are ignored', () => {
  const r = resolveUnitPrice(data([rule({ price: 500, active: false })]), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 1000);
});

test('resolveSubtotal snapshots price per line', () => {
  const full = {
    ...data([rule({ discountPct: 10 })]),
    products: [{ id: 'p1', variants: [variant] }],
  } as unknown as Pick<AppData, 'users' | 'customerGroups' | 'priceRules' | 'products'>;
  const out = resolveSubtotal(full, [{ productId: 'p1', variantId: 'v1', quantity: 3 }], null);
  assert.equal(out.total, 2700); // 900 * 3
  assert.equal(out.lines[0].result.unitPrice, 900);
});
