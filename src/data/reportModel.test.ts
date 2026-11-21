import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportModel } from './reportModel';
import type { Order, OrderLine } from '@/types';

function sampleOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'LM-2000',
    createdAt: '2026-11-21T12:00:00Z',
    customerName: 'محمد شناق',
    customerPhone: '0992656853',
    subtotal: 2403,
    shippingFee: 800,
    total: 3203,
    quotedTotal: null,
    status: 'new',
    lines: [
      { productNameAr: 'أحمر شفاه مخملي', variantNameAr: 'أحمر كرزي', quantity: 3, unitPrice: 801, lineTotal: 2403 } as OrderLine,
    ],
    address: {
      fullName: 'محمد شناق', phone: '0992656853', city: 'إدلب', area: 'Bbvv',
      street: 'Hvgv', building: '', landmarks: '', notes: '', companyName: '',
      phone2: '', email: '', deliveryTime: '', latitude: null, longitude: null, mapLabel: '',
    },
    ...overrides,
  } as Order;
}

test('model carries all customer fields with USD money', () => {
  const m = buildReportModel(sampleOrder(), 'لمسة');
  assert.equal(m.storeName, 'لمسة');
  assert.equal(m.orderNumber, 'LM-2000');
  assert.equal(m.fields.find((f) => f.label === 'العميل')?.value, 'محمد شناق');
  assert.equal(m.fields.find((f) => f.label === 'الهاتف')?.ltr, true);
  assert.equal(m.totals[0].value, '$24.03');
  assert.equal(m.totals[2].value, '$32.03');
});

test('model maps table columns and lines', () => {
  const m = buildReportModel(sampleOrder(), 'لمسة');
  assert.deepEqual(m.columns, ['المنتج', 'الوصف', 'الكمية', 'سعر الوحدة', 'المجموع']);
  assert.deepEqual(m.lines[0], ['أحمر شفاه مخملي', 'أحمر كرزي', '3', '$8.01', '$24.03']);
});

test('quoted total and difference appear when set', () => {
  const m = buildReportModel(sampleOrder({ quotedTotal: 3000 }), 'لمسة');
  assert.equal(m.finalValue, '$30.00');
  assert.match(m.difference || '', /الفرق عن الإجمالي التقديري/);
});

test('empty optional fields render as a dash', () => {
  const m = buildReportModel(sampleOrder(), 'لمسة');
  assert.equal(m.fields.find((f) => f.label === 'البريد')?.value, '—');
  assert.equal(m.notes, null);
  assert.equal(m.difference, null);
});

test('multiple line items are preserved in order', () => {
  const base = sampleOrder();
  const m = buildReportModel({
    ...base,
    lines: [
      ...base.lines,
      { productNameAr: 'عطر ورد ليلي', variantNameAr: '50 مل', quantity: 1, unitPrice: 3990, lineTotal: 3990 } as OrderLine,
    ],
  }, 'لمسة');
  assert.equal(m.lines.length, 2);
  assert.equal(m.lines[1][0], 'عطر ورد ليلي');
});
