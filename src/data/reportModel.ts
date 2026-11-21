import type { Order } from '@/types';

// Kept pure (no import from store.ts) so this module is unit-testable under
// the Node runner. USD formatting is fixed for this demo.
const formatMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The single source of truth for order-report CONTENT.
 *
 * The on-screen report (#order-report, used by Export via browser print) and
 * the shareable PDF both describe the same order. Building that description
 * here means the two outputs cannot drift apart in labels, field order, table
 * columns or totals — the divergence between them was the root cause of the
 * broken "Share as PDF" output.
 *
 * This model is renderer-agnostic: it holds plain display strings. Bidi/RTL
 * shaping is applied by each renderer (the browser for print, rtlText for
 * pdfmake), never here.
 */
export interface ReportField {
  label: string;
  value: string;
  /** LTR values (phone, email) are kept direction-locked by the renderer. */
  ltr?: boolean;
}

export interface ReportModel {
  storeName: string;
  title: string;
  orderNumber: string;
  date: string;
  fields: ReportField[];
  addressLine: string;
  deliveryTime: string;
  columns: string[];
  /** Each row is [product, variant, qty, unitPrice, lineTotal]. */
  lines: string[][];
  totals: { label: string; value: string }[];
  finalLabel: string;
  finalValue: string;
  difference: string | null;
  notes: string | null;
  disclaimer: string;
}

const dash = (v?: string | null): string => (v && v.trim() ? v : '—');

/** Build the canonical report model for an order. */
export function buildReportModel(order: Order, storeNameAr: string): ReportModel {
  const a = order.address;
  const deliveryTime = a.deliveryTime === 'morning' ? 'صباحاً'
    : a.deliveryTime === 'afternoon' ? 'ظهراً'
    : a.deliveryTime === 'evening' ? 'مساءً'
    : '';
  const addressLine = [
    a.city, a.area, a.street, a.building,
    a.landmarks ? `بالقرب من ${a.landmarks}` : '',
  ].filter(Boolean).join('، ');

  return {
    storeName: storeNameAr || 'لُما',
    title: 'تقرير طلب شراء بالجملة',
    orderNumber: order.orderNumber,
    date: new Date(order.createdAt).toLocaleDateString('ar-SY'),
    fields: [
      { label: 'العميل', value: order.customerName },
      { label: 'الهاتف', value: order.customerPhone, ltr: true },
      { label: 'الجهة', value: dash(a.companyName) },
      { label: 'هاتف إضافي', value: dash(a.phone2), ltr: true },
      { label: 'البريد', value: dash(a.email), ltr: true },
      { label: 'المحافظة', value: dash(a.city) },
    ],
    addressLine,
    deliveryTime,
    columns: ['المنتج', 'الوصف', 'الكمية', 'سعر الوحدة', 'المجموع'],
    lines: order.lines.map((l) => [
      l.productNameAr, l.variantNameAr, String(l.quantity),
      formatMoney(l.unitPrice), formatMoney(l.lineTotal),
    ]),
    totals: [
      { label: 'المجموع الفرعي (سعر الطلب)', value: formatMoney(order.subtotal) },
      { label: 'الشحن التقديري', value: order.shippingFee ? formatMoney(order.shippingFee) : '—' },
      { label: 'الإجمالي التقديري', value: formatMoney(order.total) },
    ],
    finalLabel: 'السعر النهائي المتفق عليه',
    finalValue: order.quotedTotal !== null ? formatMoney(order.quotedTotal) : 'لم يحدد بعد',
    difference: order.quotedTotal !== null && order.quotedTotal !== order.total
      ? `الفرق عن الإجمالي التقديري: ${formatMoney(order.quotedTotal - order.total)}`
      : null,
    notes: a.notes ? `ملاحظات العميل: ${a.notes}` : null,
    disclaimer: 'تقديري فقط — يخضع للمراجعة النهائية من فريق المبيعات.',
  };
}
