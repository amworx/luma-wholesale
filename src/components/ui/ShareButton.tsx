import { useState } from 'react';
import { Share2, Link2, Check, FileDown, Loader2 } from 'lucide-react';
import type { Order } from '@/types';
import { useToast } from './Toast';

/**
 * Share an object via the device's native share sheet.
 *
 * Two modes:
 *  - file mode: generates a real PDF from a printable report and shares the
 *    File, so any recipient can open the content without app access.
 *  - link mode: shares a title/text/url (used for products, where the content
 *    is the listing itself).
 *
 * Falls back to downloading the PDF / copying the link when the Web Share API
 * is unavailable or the device has no share target.
 */
interface Props {
  title: string;
  text?: string;
  url?: string;
  /** when set, shares a genuine text-based PDF generated from the order */
  order?: Order;
  /** store name for the PDF header */
  storeNameAr?: string;
  /** filename for the generated PDF (without extension) */
  fileName?: string;
  className?: string;
  compact?: boolean;
}

export function ShareButton({ title, text = '', url, order, storeNameAr = 'لُما', fileName, className = '', compact = false }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let file: File | undefined;
      if (order) {
        const { generateOrderPdf } = await import('@/data/reportPdf');
        file = await generateOrderPdf(order, storeNameAr, fileName || title);
      }

      // When sharing a FILE, pass ONLY title + files. Several Android browsers
      // reject a share payload that mixes `files` with `text`/`url`, which was
      // silently falling through to the download fallback.
      const data: ShareData = file
        ? { title, files: [file] }
        : { title, text, url: shareUrl };

      // Try the native share sheet whenever it exists. Some browsers report
      // canShare({files}) === false yet still accept the file, so we attempt
      // the share first and only fall back if it actually fails.
      if (navigator.share) {
        try {
          await navigator.share(data);
          return; // shared successfully
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return; // user cancelled
          // Sharing failed on this device — fall through to fallback.
        }
      }

      // Fallback: download the PDF so it can be forwarded manually, or copy link.
      if (file) {
        const { downloadPdf } = await import('@/data/reportPdf');
        downloadPdf(file);
        toast.show('تم تنزيل ملف PDF — افتحه من جهازك ثم أرسله من تطبيق المشاركة', 'success');
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`.trim());
        setCopied(true);
        toast.show('تم نسخ الرابط', 'success');
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.show('تعذّر تحضير المحتوى للمشاركة', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className={`btn btn-outline btn-sm ${className}`} onClick={() => void share()} disabled={busy}>
      {busy ? <Loader2 size={15} className="spin" />
        : copied ? <Check size={15} />
        : order ? <FileDown size={15} />
        : <Share2 size={15} />}
      {busy ? 'جارٍ التحضير...' : compact ? 'مشاركة' : order ? 'مشاركة PDF' : 'مشاركة'}
      {!order && !busy && <Link2 size={13} style={{ opacity: .6 }} />}
    </button>
  );
}
