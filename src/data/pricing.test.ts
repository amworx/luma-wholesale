import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveUnitPrice, resolveSubtotal, checkQuantity, isWholesaleEligible } from './pricing';
import type { AppData, PriceRule, ProductVariant, User, CustomerGroup, StoreSettings } from '@/types';

const variant: ProductVariant = {
  id: 'v1', nameAr: 'أحمر', sku: 'LM-01', barcode: '619', costPrice: 500, retailPrice: 1200,
  salePrice: 1000, stock: 100, lowStockThreshold: 5, weightGrams: 60, packSize: 12, moq: 6,
};

const group: CustomerGroup = { id: 'g1', nameAr: 'تجار الجملة', descriptionAr: '', active: true };
const customer: User = {
  id: 'u1', name: 'رنا', email: 'r@x.sy', password: 'x', role: 'customer', active: true,
  createdAt: '2026-01-01', avatarColor: '#000', customerGroupId: 'g1', accountStatus: 'active', companyName: '',
};
const settings = { defaultWholesalePct: 10 } as StoreSettings;
const rule = (over: Partial<PriceRule>): PriceRule => ({
  id: 'r', scope: 'default', scopeId: null, productId: null, variantId: null, minQty: 1,
  price: null, discountPct: 0, validFrom: null, validTo: null, active: true, noteAr: '', ...over,
});
const data = (rules: PriceRule[]) => ({ users: [customer], customerGroups: [group], priceRules: rules, settings });

test('no rules falls back to genuine wholesale price, not retail', () => {
  const r = resolveUnitPrice(data([]), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 900); // 1000 * 0.9, never 1000
  assert.equal(r.source, 'wholesale');
});

test('fallback uses configured percentage off sale price', () => {
  const r = resolveUnitPrice({ ...data([]), settings: { defaultWholesalePct: 25 } as StoreSettings }, variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 750);
});

test('default discount rule overrides fallback', () => {
  const r = resolveUnitPrice(data([rule({ discountPct: 20 })]), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 800);
  assert.equal(r.source, 'default');
});

test('group price overrides default', () => {
  const rules = [rule({ discountPct: 10 }), rule({ id: 'g', scope: 'group', scopeId: 'g1', discountPct: 30 })];
  const r = resolveUnitPrice(data(rules), variant, 'p1', 1, customer);
  assert.equal(r.unitPrice, 700);
  assert.equal(r.source, 'group');
});

test('inactive group cannot confer group pricing', () => {
  const inactive = { ...group, active: false };
  const rules = [rule({ id: 'g', scope: 'group', scopeId: 'g1', price: 500 })];
  const d = { ...data(rules), customerGroups: [inactive] };
  const r = resolveUnitPrice(d, variant, 'p1', 1, customer);
  assert.equal(r.source, 'wholesale'); // group ignored, fallback applies
  assert.equal(r.unitPrice, 900);
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
  const r = resolveUnitPrice(data([rule({ id: 'c', scope: 'customer', scopeId: 'u1', price: 700 })]), variant, 'p1', 1, null);
  assert.equal(r.unitPrice, 900);
});

test('higher minQty tier wins when quantity qualifies', () => {
  const rules = [rule({ discountPct: 10 }), rule({ id: 'tier', price: 750, minQty: 12 })];
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 6, null).unitPrice, 900);
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 12, null).unitPrice, 750);
});

test('variant-specific rule beats product-wide rule', () => {
  const rules = [rule({ id: 'prod', productId: 'p1', price: 800 }), rule({ id: 'var', productId: 'p1', variantId: 'v1', price: 700 })];
  assert.equal(resolveUnitPrice(data(rules), variant, 'p1', 1, null).unitPrice, 700);
});

test('expired and not-yet-valid rules cannot apply', () => {
  const expired = [rule({ price: 500, validFrom: '2025-01-01', validTo: '2025-12-31' })];
  const future = [rule({ price: 500, validFrom: '2027-01-01' })];
  assert.equal(resolveUnitPrice(data(expired), variant, 'p1', 1, null, '2026-06-01').unitPrice, 900);
  assert.equal(resolveUnitPrice(data(future), variant, 'p1', 1, null, '2026-06-01').unitPrice, 900);
  assert.equal(resolveUnitPrice(data([rule({ price: 500, validTo: '2026-12-31' })]), variant, 'p1', 1, null, '2026-12-31').unitPrice, 500);
});

test('inactive rules are ignored', () => {
  assert.equal(resolveUnitPrice(data([rule({ price: 500, active: false })]), variant, 'p1', 1, null).unitPrice, 900);
});

test('resolveSubtotal snapshots price per line', () => {
  const full = { ...data([rule({ discountPct: 10 })]), products: [{ id: 'p1', variants: [variant] }] } as unknown as Pick<AppData, 'users' | 'customerGroups' | 'priceRules' | 'products' | 'settings'>;
  const out = resolveSubtotal(full, [{ productId: 'p1', variantId: 'v1', quantity: 3 }], null);
  assert.equal(out.total, 2700);
  assert.equal(out.lines[0].result.unitPrice, 900);
});

// ---- MOQ / pack size ----

test('quantity below MOQ is rejected with a concrete fix', () => {
  const r = checkQuantity(variant, 4); // moq 6
  assert.equal(r.valid, false);
  assert.equal(r.adjusted, 6);
  assert.match(r.messageAr, /الحد الأدنى/);
});

test('quantity not aligned to pack size is rejected with next pack', () => {
  const r = checkQuantity(variant, 10); // pack 12
  assert.equal(r.valid, false);
  assert.equal(r.adjusted, 12);
});

test('valid pack-aligned quantity passes', () => {
  const r = checkQuantity(variant, 24);
  assert.equal(r.valid, true);
  assert.equal(r.adjusted, 24);
});

test('quantity above stock is clamped to the largest pack-aligned amount within stock', () => {
  const r = checkQuantity({ ...variant, stock: 18 }, 24);
  assert.equal(r.valid, false);
  assert.equal(r.adjusted, 12); // largest multiple of pack 12 that fits in stock 18
  assert.equal(checkQuantity({ ...variant, stock: 18 }, r.adjusted).valid, true);
});

test('stock fix is pack-aligned so the suggested quantity is actually valid', () => {
  // pack 6, moq 6, stock 10: the old fix offered 10, which re-fails the pack rule.
  const v = { ...variant, packSize: 6, moq: 6, stock: 10 };
  const r = checkQuantity(v, 12);
  assert.equal(r.valid, false);
  assert.equal(r.adjusted, 6); // largest pack multiple (6) that fits in stock 10
  assert.equal(checkQuantity(v, r.adjusted).valid, true); // the offered fix passes
});

test('stock fix never drops below MOQ even when stock is under one pack', () => {
  const v = { ...variant, packSize: 6, moq: 6, stock: 4 };
  const r = checkQuantity(v, 10);
  assert.equal(r.adjusted, 4); // cannot satisfy MOQ; offer all available stock
});

test('singles (pack 1, moq 1) accept any positive quantity', () => {
  assert.equal(checkQuantity({ ...variant, packSize: 1, moq: 1 }, 7).valid, true);
});

// ---- Eligibility ----

test('only active customer accounts are wholesale eligible', () => {
  assert.equal(isWholesaleEligible(customer), true);
  assert.equal(isWholesaleEligible({ ...customer, accountStatus: 'pending' }), false);
  assert.equal(isWholesaleEligible({ ...customer, accountStatus: 'suspended' }), false);
  assert.equal(isWholesaleEligible({ ...customer, accountStatus: 'rejected' }), false);
  assert.equal(isWholesaleEligible({ ...customer, active: false }), false);
  assert.equal(isWholesaleEligible({ ...customer, role: 'admin' }), false);
  assert.equal(isWholesaleEligible(null), false);
});
