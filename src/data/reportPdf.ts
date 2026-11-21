import type { Order } from '@/types';
import type { TDocumentDefinitions, Content, TFontDictionary } from 'pdfmake/interfaces';
import { assetUrl, formatMoney } from './store';

/** Minimal shape of the lazily-imported pdfmake runtime. */
interface PdfMakeRuntime {
  addVirtualFileSystem(vfs: Record<string, string>): void;
  createPdf(doc: TDocumentDefinitions, tableLayouts?: unknown, fonts?: TFontDictionary): {
    getBlob(cb: (blob: Blob) => void): void;
  };
}

/**
 * Generate a genuine, text-based Arabic PDF for an order report.
 *
 * Unlike the previous html2canvas approach (which flattened the DOM into an
 * image), this uses pdfmake with an embedded SIL-OFL Arabic font. The result
 * is selectable, searchable text with correct RTL shaping — the same content
 * as the printable report, in a self-contained file anyone can open without
 * access to the app.
 *
 * pdfmake and the font files are lazy-loaded so normal browsing is unaffected.
 */

interface LoadedPdf { pdfmake: PdfMakeRuntime; fonts: TFontDictionary }

let fontsReady: Promise<LoadedPdf> | null = null;

async function loadFonts(): Promise<LoadedPdf> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const [{ default: pdfmakeRaw }] = await Promise.all([import('pdfmake/build/pdfmake.js')]);
      // The runtime exposes addVirtualFileSystem; the community @types omit it.
      const pdfmake = pdfmakeRaw as unknown as PdfMakeRuntime;
      const [regular, bold] = await Promise.all([
        fetch(assetUrl('fonts/Amiri-Regular.ttf')).then((r) => r.arrayBuffer()),
        fetch(assetUrl('fonts/Amiri-Bold.ttf')).then((r) => r.arrayBuffer()),
      ]);
      const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };
      const vfs: Record<string, string> = {
        'Amiri-Regular.ttf': toBase64(regular),
        'Amiri-Bold.ttf': toBase64(bold),
      };
      pdfmake.addVirtualFileSystem(vfs);
      const fonts = {
        Amiri: {
          normal: 'Amiri-Regular.ttf', bold: 'Amiri-Bold.ttf',
          italics: 'Amiri-Regular.ttf', bolditalics: 'Amiri-Bold.ttf',
        },
      };
      return { pdfmake, fonts };
    })();
  }
  return fontsReady as Promise<LoadedPdf>;
}

const money = (cents: number) => formatMoney(cents);
const dash = (v?: string | null) => v && v.trim() ? v : '—';

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

  const tableBody: string[][] = [
    ['المنتج', 'الوصف', 'الكمية', 'سعر الوحدة', 'المجموع'],
    ...order.lines.map((l) => [l.productNameAr, l.variantNameAr, String(l.quantity), money(l.unitPrice), money(l.lineTotal)]),
  ];

  const totals: [string, string][] = [
    ['المجموع الفرعي (سعر الطلب)', money(order.subtotal)],
    ['الشحن التقديري', order.shippingFee ? money(order.shippingFee) : '—'],
    ['الإجمالي التقديري', money(order.total)],
  ];

  const content: Content[] = [
    { text: storeNameAr, fontSize: 20, bold: true, color: '#7c1d4f', alignment: 'right', margin: [0, 0, 0, 2] },
    { text: 'تقرير طلب شراء بالجملة', fontSize: 11, color: '#666666', alignment: 'right', margin: [0, 0, 0, 10] },
    {
      columns: [
        { text: order.orderNumber, fontSize: 16, bold: true, alignment: 'left' },
        { text: new Date(order.createdAt).toLocaleDateString('ar-SY'), fontSize: 11, color: '#666666', alignment: 'right' },
      ],
      margin: [0, 0, 0, 8],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#7c1d4f' }], margin: [0, 0, 0, 12] },
    {
      columns: [
        {
          width: '50%',
          stack: info.slice(0, 3).map(([k, v]) => ({ text: [{ text: `${k}: `, color: '#666666' }, { text: v, bold: true }], fontSize: 11, margin: [0, 0, 0, 4] })),
        },
        {
          width: '50%',
          stack: info.slice(3).map(([k, v]) => ({ text: [{ text: `${k}: `, color: '#666666' }, { text: v, bold: true }], fontSize: 11, margin: [0, 0, 0, 4] })),
        },
      ],
      margin: [0, 0, 0, 6],
    },
    { text: [{ text: 'العنوان: ', color: '#666666' }, { text: addressLine, bold: true }], fontSize: 11, margin: [0, 0, 0, 4] },
    ...(deliveryTime ? [{ text: [{ text: 'وقت التوصيل: ', color: '#666666' }, { text: deliveryTime, bold: true }], fontSize: 11, margin: [0, 0, 0, 10] } as Content] : []),
    {
      table: {
        headerRows: 1,
        widths: ['26%', '26%', '10%', '18%', '20%'],
        body: tableBody.map((row, i) => row.map((cell) => ({
          text: cell, fontSize: 10, bold: i === 0,
          ...(i === 0 ? { fillColor: '#f2eef1' } : {}),
        }))),
      },
      layout: {
        hLineWidth: () => 0.6, vLineWidth: () => 0.6,
        hLineColor: () => '#bbbbbb', vLineColor: () => '#bbbbbb',
        paddingTop: () => 5, paddingBottom: () => 5,
      },
      margin: [0, 6, 0, 12],
    },
    ...totals.map(([k, v]) => ({
      columns: [{ text: k, fontSize: 11 }, { text: v, fontSize: 11, bold: true, alignment: 'right' as const }],
      margin: [0, 0, 0, 3] as [number, number, number, number],
    })),
    {
      columns: [
        { text: 'السعر النهائي المتفق عليه', fontSize: 13, bold: true, color: '#7c1d4f' },
        { text: order.quotedTotal !== null ? money(order.quotedTotal) : 'لم يحدد بعد', fontSize: 13, bold: true, color: '#7c1d4f', alignment: 'right' },
      ],
      margin: [0, 8, 0, 4],
    },
    ...(order.quotedTotal !== null && order.quotedTotal !== order.total
      ? [{ text: `الفرق عن الإجمالي التقديري: ${money(order.quotedTotal - order.total)}`, fontSize: 10, color: '#666666', margin: [0, 0, 0, 6] } as Content]
      : []),
    ...(a.notes ? [{ text: `ملاحظات العميل: ${a.notes}`, fontSize: 10, color: '#666666', margin: [0, 8, 0, 0] } as Content] : []),
    { text: 'تقديري فقط — يخضع للمراجعة النهائية من فريق المبيعات.', fontSize: 9, color: '#999999', alignment: 'center', margin: [0, 20, 0, 0] },
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
  const { pdfmake, fonts } = await loadFonts();
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
