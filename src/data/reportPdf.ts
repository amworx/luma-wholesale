import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Render a printable report (#order-report) into a real PDF *file*.
 *
 * We rasterise the DOM with html2canvas and embed the image in jsPDF. This
 * keeps Arabic/RTL pixel-perfect (the browser renders the text) and makes the
 * output a self-contained file: anyone who receives it can open it in any PDF
 * viewer, with no access to the app or its data. That is the whole point of
 * sharing a report as a file rather than as a link.
 */
export async function generateReportPdf(elementId: string, filenameAr: string): Promise<File> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('report element not found');

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();   // 210
  const pageH = pdf.internal.pageSize.getHeight();  // 297
  const margin = 10;
  const drawW = pageW - margin * 2;                  // 190 mm
  const pxPerMm = canvas.width / drawW;
  const slicePx = Math.floor((pageH - margin * 2) * pxPerMm);

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    const h = Math.min(slicePx, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, drawW, h / pxPerMm);
    y += h;
    first = false;
  }

  const blob = pdf.output('blob');
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
