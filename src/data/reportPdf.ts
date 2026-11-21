import type { Order } from '@/types';
import type { TDocumentDefinitions, Content, TFontDictionary } from 'pdfmake/interfaces';
import bidiFactory from 'bidi-js';
import { assetUrl, formatMoney } from './store';

/**
 * Generate a genuine, text-based, RTL-correct Arabic PDF for an order report.
 *
 * pdfmake embeds real (selectable) text but has no Unicode bidi algorithm, so
 * mixed Arabic + digits/Latin renders with flipped words and reversed dates.
 * We fix that by feeding pdfmake the "reverse of the bidi visual order" for
 * every Arabic string — pdfmake reverses each line internally, so this double
 * reversal lands the glyphs in the correct visual order. Table columns are
 * reversed so the first column sits on the right, as expected in RTL.
 *
 * pdfmake, the font and bidi-js are lazy-loaded: normal browsing is unaffected.
 */

interface PdfMakeRuntime {
  addVirtualFileSystem(vfs: Record<string, string>): void;
  createPdf(doc: TDocumentDefinitions, tableLayouts?: unknown, fonts?: TFontDictionary): {
    getBlob(cb: (blob: Blob) => void): void;
  };
}
interface LoadedPdf { pdfmake: PdfMakeRuntime; fonts: TFontDictionary }

let loaded: Promise<LoadedPdf> | null = null;
async function loadPdf(): Promise<LoadedPdf> {
  if (!loaded) {
    loaded = (async () => {
      const [{ default: raw }] = await Promise.all([import('pdfmake/build/pdfmake.js')]);
      const pdfmake = raw as unknown as PdfMakeRuntime;
      const [regular, bold] = await Promise.all([
        fetch(assetUrl('fonts/Amiri-Regular.ttf')).then((r) => r.arrayBuffer()),
        fetch(assetUrl('fonts/Amiri-Bold.ttf')).then((r) => r.arrayBuffer()),
      ]);
      const b64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let s = '';
        for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return btoa(s);
      };
      pdfmake.addVirtualFileSystem({
        'Amiri-Regular.ttf': b64(regular),
        'Amiri-Bold.ttf': b64(bold),
      });
      const fonts: TFontDictionary = {
        Amiri: {
          normal: 'Amiri-Regular.ttf', bold: 'Amiri-Bold.ttf',
          italics: 'Amiri-Regular.ttf', bolditalics: 'Amiri-Bold.ttf',
        },
      };
      return { pdfmake, fonts };
    })();
  }
  return loaded;
}

// --- bidi ordering -------------------------------------------------------
const bidi = bidiFactory();
const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
// Digits (ASCII or Arabic-Indic) and Latin letters are "weak" characters whose
// position depends on the bidi algorithm. Pure Arabic text has none of these.
const hasWeak = (s: string) => /[0-9\u0660-\u0669A-Za-z]/.test(s);
const reverse = (s: string) => [...s].reverse().join('');
const NBSP = '\u00A0';

/**
 * Correct visual order for a string that pdfmake will reverse internally.
 *
 * - Pure LTR (order no., phone, $ price) passes through untouched.
 * - Pure Arabic (letters + spaces) also passes through: pdfmake already lays
 *   it out right-to-left, and a bidi transform here scrambles word order.
 * - Mixed Arabic + digits/Latin gets the bidi visual-order transform so dates
 *   and numbers land on the correct side.
 *
 * pdfmake collapses ordinary spaces between Arabic words, so we use NBSP.
 */
export function rtlText(s: string): string {
  if (!s || !hasArabic(s)) return s;
  const out = hasWeak(s)
    ? reverse(bidi.getReorderedString(s, bidi.getEmbeddingLevels(s, 'rtl')))
    : s;
  return out.replace(/ /g, NBSP);
}

const money = (cents: number) => formatMoney(cents);
const dash = (v?: string | null) => v && v.trim() ? v : '—';
const t = (s: string) => rtlText(s);

/** Build the pdfmake document definition for an order, mirroring the on-screen report. */
export function buildOrderReportDoc(order: Order, storeNameAr: string): TDocumentDefinitions {
  const a = order.address;
  const deliveryTime = a.deliveryTime === 'morning' ? 'صباحاً' : a.deliveryTime === 'afternoon' ? 'ظهراً' : a.deliveryTime === 'evening' ? 'مساءً' : '';
  const addressLine = [a.city, a.area, a.street, a.building, a.landmarks ? `بالقرب من ${a.landmarks}` : ''].filter(Boolean).join('، ');

  const info: [string, string][] = [
    ['العميل', order.customerName],
    ['الهاتف', order.customerPhone],
    ['الجهة', dash(a.companyName)],
    ['هاتف إضافي', dash(a.phone2)],
    ['البريد', dash(a.email)],
    ['المحافظة', dash(a.city)],
  ];

  // Table: build logical rows, then reverse column order so column 1 is on the right.
  // Every cell is right-aligned (RTL) and given generous padding so nothing is cramped.
  const header = ['المنتج', 'الوصف', 'الكمية', 'سعر الوحدة', 'المجموع'].map(t);
  const dataRows = order.lines.map((l) => [
    t(l.productNameAr), t(l.variantNameAr), String(l.quantity), money(l.unitPrice), money(l.lineTotal),
  ]);
  const widths = ['26%', '26%', '10%', '18%', '20%'];
  const tableBody = [header, ...dataRows].map((row, i) =>
    [...row].reverse().map((cell) => ({
      text: cell, fontSize: 12, bold: i === 0, alignment: 'right' as const,
      color: i === 0 ? '#ffffff' : '#1f1f1f',
      ...(i === 0 ? { fillColor: '#7c1d4f' } : {}),
    })),
  );

  const totalRows: [string, string][] = [
    ['المجموع الفرعي', money(order.subtotal)],
    ['الشحن التقديري', order.shippingFee ? money(order.shippingFee) : '—'],
    ['الإجمالي التقديري', money(order.total)],
  ];

  // Put the space at the START of the value run: pdfmake trims trailing
  // whitespace in a run, which otherwise glues the label to the value.
  const field = ([k, v]: [string, string]) => ({
    text: [{ text: `${t(k)}:`, color: '#666666' }, { text: `\u00A0${t(v)}`, bold: true }],
    fontSize: 12, alignment: 'right' as const, margin: [0, 0, 0, 7] as [number, number, number, number],
  });

  const content: Content[] = [
    { text: t(storeNameAr), fontSize: 26, bold: true, color: '#7c1d4f', alignment: 'right', margin: [0, 0, 0, 4] },
    { text: t('تقرير طلب شراء بالجملة'), fontSize: 13, color: '#666666', alignment: 'right', margin: [0, 0, 0, 14] },
    {
      columns: [
        { text: t(new Date(order.createdAt).toLocaleDateString('ar-SY')), fontSize: 12, color: '#666666', alignment: 'left' },
        { text: order.orderNumber, fontSize: 18, bold: true, alignment: 'right' },
      ],
      margin: [0, 0, 0, 10],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#7c1d4f' }], margin: [0, 0, 0, 16] },
    {
      columns: [
        { width: '50%', stack: info.slice(3).map(field) },
        { width: '50%', stack: info.slice(0, 3).map(field) },
      ],
      margin: [0, 0, 0, 6],
    },
    { text: [{ text: `${t('العنوان')}:`, color: '#666666' }, { text: `\u00A0${t(addressLine)}`, bold: true }], fontSize: 12, alignment: 'right', margin: [0, 0, 0, 7] },
    ...(deliveryTime ? [{ text: [{ text: `${t('وقت التوصيل')}:`, color: '#666666' }, { text: `\u00A0${t(deliveryTime)}`, bold: true }], fontSize: 12, alignment: 'right', margin: [0, 0, 0, 12] } as Content] : []),
    {
      table: {
        headerRows: 1,
        widths: [...widths].reverse(),
        body: tableBody,
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 || i === 1 ? 1 : 0.6),
        vLineWidth: () => 0.6,
        hLineColor: () => '#cccccc', vLineColor: () => '#cccccc',
        paddingTop: () => 9, paddingBottom: () => 9, paddingLeft: () => 8, paddingRight: () => 8,
      },
      margin: [0, 6, 0, 16],
    },
    ...totalRows.map(([k, v]) => ({
      columns: [
        { text: v, fontSize: 12, bold: true, alignment: 'left' as const },
        { text: t(k), fontSize: 12, alignment: 'right' as const },
      ],
      margin: [0, 0, 0, 6] as [number, number, number, number],
    })),
    {
      columns: [
        { text: order.quotedTotal !== null ? money(order.quotedTotal) : t('لم يحدد بعد'), fontSize: 15, bold: true, color: '#7c1d4f', alignment: 'left' },
        { text: t('السعر النهائي المتفق عليه'), fontSize: 15, bold: true, color: '#7c1d4f', alignment: 'right' },
      ],
      margin: [0, 12, 0, 6],
    },
    ...(order.quotedTotal !== null && order.quotedTotal !== order.total
      ? [{ text: t(`الفرق عن الإجمالي التقديري: ${money(order.quotedTotal - order.total)}`), fontSize: 10, color: '#666666', margin: [0, 0, 0, 6] } as Content]
      : []),
    ...(a.notes ? [{ text: t(`ملاحظات العميل: ${a.notes}`), fontSize: 10, color: '#666666', margin: [0, 8, 0, 0] } as Content] : []),
    { text: t('تقديري فقط — يخضع للمراجعة النهائية من فريق المبيعات.'), fontSize: 9, color: '#999999', alignment: 'center', margin: [0, 20, 0, 0] },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content,
    defaultStyle: { font: 'Amiri' },
  };
}

/** Generate the PDF File from order data. */
export async function generateOrderPdf(order: Order, storeNameAr: string, filenameAr: string): Promise<File> {
  const { pdfmake, fonts } = await loadPdf();
  const doc = buildOrderReportDoc(order, storeNameAr);
  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      pdfmake.createPdf(doc, undefined, fonts).getBlob((b: Blob) => resolve(b));
    } catch (e) { reject(e); }
  });
  const safeName = (filenameAr || 'report').replace(/[\\/:*?"<>|]/g, '-');
  return new File([blob], `${safeName}.pdf`, { type: 'application/pdf' });
}

/** Download the report PDF locally (fallback when the device has no share sheet). */
export function downloadPdf(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
