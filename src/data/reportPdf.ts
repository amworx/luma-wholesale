import type { TDocumentDefinitions, Content, TFontDictionary } from 'pdfmake/interfaces';
import bidiFactory from 'bidi-js';
import { assetUrl } from './store';
import { buildReportModel, type ReportModel } from './reportModel';

/**
 * Generate a genuine, text-based Arabic PDF for SHARING an order report.
 *
 * Why this exists: Export uses the browser's own print engine on the live
 * #order-report DOM, which handles Arabic shaping/bidi/RTL natively. Web Share
 * needs a File Blob, which window.print() cannot produce, so sharing must use
 * a Blob-capable renderer (pdfmake). To stop the two outputs diverging, the
 * CONTENT comes from the shared reportModel — the same order fields, table and
 * totals the on-screen report shows. Only the output mechanism differs.
 *
 * pdfmake has no Unicode bidi algorithm, so mixed Arabic + numbers/Latin needs
 * pre-ordering (rtlText below). Pure Arabic is left untouched. Fonts, pdfmake
 * and bidi-js are lazy-loaded so normal browsing is unaffected.
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

// --- bidi ordering for pdfmake --------------------------------------------
const bidi = bidiFactory();
const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);
const hasWeak = (s: string) => /[0-9\u0660-\u0669A-Za-z]/.test(s);
const reverse = (s: string) => [...s].reverse().join('');
const NBSP = '\u00A0';

/**
 * Prepare a display string for pdfmake.
 * - Pure LTR (order no., phone, $ price): untouched.
 * - Pure Arabic: untouched (pdfmake already lays Arabic out RTL; reordering
 *   pure Arabic is what previously glued words together).
 * - Mixed Arabic + digits/Latin: reverse the bidi visual order so dates and
 *   inline numbers land on the correct side.
 * Spaces become NBSP because pdfmake collapses ordinary spaces in RTL runs.
 */
export function rtlText(s: string): string {
  if (!s) return s;
  if (!hasArabic(s)) return s;
  const out = hasWeak(s)
    ? reverse(bidi.getReorderedString(s, bidi.getEmbeddingLevels(s, 'rtl')))
    : s;
  // pdfmake collapses ordinary spaces inside RTL runs; NBSP preserves them.
  return out.replace(/ /g, NBSP);
}

const t = (s: string) => rtlText(s);

/** Build a pdfmake document definition from the canonical report model. */
export function buildOrderReportDoc(model: ReportModel): TDocumentDefinitions {
  // Table columns are reversed so column 1 renders on the right (RTL).
  const header = model.columns.map(t);
  const dataRows = model.lines.map((row) => row.map((cell, i) =>
    i >= 2 ? cell : t(cell) // qty/price are LTR; product/variant are Arabic
  ));
  const widths = ['26%', '26%', '10%', '18%', '20%'];
  const tableBody = [header, ...dataRows].map((row, i) =>
    [...row].reverse().map((cell) => ({
      text: cell, fontSize: 12, bold: i === 0, alignment: 'right' as const,
      color: i === 0 ? '#ffffff' : '#1f1f1f',
      ...(i === 0 ? { fillColor: '#7c1d4f' } : {}),
    })),
  );

  // A space character after the colon collapses in pdfmake's RTL layout (the
  // colon is a neutral char). Make the gap STRUCTURAL: value | spacer | label
  // columns, so no space glyph is involved. pdfmake lays columns out LTR, so
  // this array is [value, gap, label] = label on the right in the final RTL view.
  const field = (label: string, value: string, ltr = false) => ({
    columns: [
      { width: '*', text: ltr ? value : t(value), fontSize: 12, bold: true, alignment: 'right' as const },
      { width: 14, text: '' },
      { width: 'auto', text: `${t(label)}:`, fontSize: 12, color: '#666666', alignment: 'right' as const },
    ],
    margin: [0, 0, 0, 7] as [number, number, number, number],
  });

  const content: Content[] = [
    { text: t(model.storeName), fontSize: 26, bold: true, color: '#7c1d4f', alignment: 'right', margin: [0, 0, 0, 4] },
    { text: t(model.title), fontSize: 13, color: '#666666', alignment: 'right', margin: [0, 0, 0, 14] },
    {
      columns: [
        { text: t(model.date), fontSize: 12, color: '#666666', alignment: 'left' },
        { text: model.orderNumber, fontSize: 18, bold: true, alignment: 'right' },
      ],
      margin: [0, 0, 0, 10],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#7c1d4f' }], margin: [0, 0, 0, 16] },
    ...model.fields.map((f) => field(f.label, f.value, f.ltr)),
    field('العنوان', model.addressLine),
    ...(model.deliveryTime ? [{ ...field('وقت التوصيل', model.deliveryTime), margin: [0, 0, 0, 12] as [number, number, number, number] } as Content] : []),
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
    ...model.totals.map(({ label, value }) => ({
      columns: [
        { text: value, fontSize: 12, bold: true, alignment: 'left' as const },
        { text: t(label), fontSize: 12, alignment: 'right' as const },
      ],
      margin: [0, 0, 0, 6] as [number, number, number, number],
    })),
    {
      columns: [
        { width: '35%', text: model.finalValue.startsWith('$') ? model.finalValue : t(model.finalValue), fontSize: 15, bold: true, color: '#7c1d4f', alignment: 'left' },
        { width: '65%', text: t(model.finalLabel), fontSize: 15, bold: true, color: '#7c1d4f', alignment: 'right' },
      ],
      margin: [0, 12, 0, 6],
    },
    ...(model.difference ? [{ text: t(model.difference), fontSize: 10, color: '#666666', margin: [0, 0, 0, 6] } as Content] : []),
    ...(model.notes ? [{ text: t(model.notes), fontSize: 10, color: '#666666', margin: [0, 8, 0, 0] } as Content] : []),
    { text: t(model.disclaimer), fontSize: 9, color: '#999999', alignment: 'center', margin: [0, 20, 0, 0] },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content,
    defaultStyle: { font: 'Amiri' },
  };
}

/** Generate the shareable PDF File from an order (content from the shared model). */
export async function generateOrderPdf(order: Parameters<typeof buildReportModel>[0], storeNameAr: string, filenameAr: string): Promise<File> {
  const { pdfmake, fonts } = await loadPdf();
  const doc = buildOrderReportDoc(buildReportModel(order, storeNameAr));
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
