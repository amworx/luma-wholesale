/**
 * Print / export the currently visible printable report (#order-report) to PDF.
 *
 * Arabic/RTL renders correctly through the browser's own print engine, so we
 * use print-to-PDF rather than jsPDF (which would need embedded Arabic fonts).
 *
 * Blank-page fix: the old CSS used `visibility:hidden` on the app, which kept
 * the entire page's height in layout and produced empty trailing pages. Here
 * we clone just the report into a dedicated #print-portal and hide the app root
 * with `display:none`, so the printed document contains only the report.
 */

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

/** Export the report to PDF via the browser print dialog with a useful name. */
export function exportReportPdf(titleAr: string): void {
  const previous = document.title;
  document.title = titleAr;
  requestAnimationFrame(() => {
    printReport();
    window.setTimeout(() => { document.title = previous; }, 1000);
  });
}
