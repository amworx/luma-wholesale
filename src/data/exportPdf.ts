/**
 * Export the currently visible printable report (#order-report) to PDF.
 *
 * Arabic/RTL text renders correctly through the browser's own print engine, so
 * we use print-to-PDF rather than a canvas/jsPDF library (which would need
 * embedded Arabic fonts). On desktop the user picks "Save as PDF"; on Android
 * Chrome picks "Save as PDF" from the print dialog. Setting document.title
 * gives the saved file a useful name.
 */
export function exportReportPdf(titleAr: string): void {
  const previous = document.title;
  document.title = titleAr;
  // Let the browser apply the new title before opening the print dialog.
  requestAnimationFrame(() => {
    window.print();
    // Restore after the dialog closes (print() is synchronous in most browsers).
    window.setTimeout(() => { document.title = previous; }, 1000);
  });
}
