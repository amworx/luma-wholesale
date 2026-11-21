import type { Order } from '@/types';

/**
 * Export an order report to PDF.
 *
 * Both "Export PDF" and "Share PDF" now go through the SAME generator
 * (generateOrderPdf -> reportModel -> pdfmake). Previously Export used the
 * browser print dialog on hand-written report DOM while Share rebuilt the
 * report in pdfmake; the two definitions drifted apart, which is exactly why
 * the shared PDF looked broken while Export looked fine. One content source
 * and one renderer means the two outputs are now identical.
 *
 * The browser-print path is still available via printReport() for the
 * dedicated "print" button.
 */
export async function exportReportPdf(order: Order, storeNameAr: string, titleAr: string): Promise<void> {
  const { generateOrderPdf, downloadPdf } = await import('./reportPdf');
  const file = await generateOrderPdf(order, storeNameAr, titleAr);
  downloadPdf(file);
}

function preparePrint(): boolean {
  const source = document.getElementById('order-report');
  if (!source) return false;
  document.getElementById('print-portal')?.remove();
  const portal = document.createElement('div');
  portal.id = 'print-portal';
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id'); // avoid a duplicate #order-report in the DOM
  clone.style.margin = '0';
  portal.appendChild(clone);
  document.body.appendChild(portal);
  document.body.classList.add('is-printing');
  return true;
}

function cleanupPrint(): void {
  document.getElementById('print-portal')?.remove();
  document.body.classList.remove('is-printing');
}

/** Print only the report, with no blank pages. */
export function printReport(): void {
  if (!preparePrint()) { window.print(); return; }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    cleanupPrint();
    window.removeEventListener('afterprint', finish);
  };
  window.addEventListener('afterprint', finish);
  window.print();
  // Safari/Android may not fire afterprint reliably; clean up as a fallback.
  window.setTimeout(finish, 5000);
}
