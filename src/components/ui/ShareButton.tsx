import { useEffect, useRef, useState } from 'react';
import { Share2, Link2, Check, FileDown, Loader2 } from 'lucide-react';
import type { Order } from '@/types';
import { useToast } from './Toast';

/**
 * Share an object via the device's native share sheet.
 *
 * The Web Share API requires a LIVE user gesture. Generating the PDF inside
 * the click (dynamic import + font fetch + pdfmake) burns that gesture, so the
 * browser rejects navigator.share() and we silently downloaded instead. Fix:
 * pre-generate the File on mount, keep the button disabled until it is ready,
 * and call navigator.share() SYNCHRONOUSLY in the click — no await first.
 */
interface Props {
  title: string;
  text?: string;
  url?: string;
  order?: Order;
  storeNameAr?: string;
  fileName?: string;
  className?: string;
  compact?: boolean;
}

export function ShareButton({ title, text = '', url, order, storeNameAr = 'لُما', fileName, className = '', compact = false }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<File | undefined>(undefined);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  // Build the PDF before the user taps, so the share call needs no await.
  useEffect(() => {
    fileRef.current = undefined;
    setReady(false);
    if (!order) { setReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const { generateOrderPdf } = await import('@/data/reportPdf');
        const f = await generateOrderPdf(order, storeNameAr, fileName || title);
        if (!cancelled) { fileRef.current = f; setReady(true); }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [order, storeNameAr, fileName, title]);

  const download = async (f: File) => {
    const { downloadPdf } = await import('@/data/reportPdf');
    downloadPdf(f);
    toast.show('المشاركة غير متاحة — تم تنزيل الملف', 'success');
  };

  const share = () => {
    if (busy) return;

    if (order) {
      const f = fileRef.current;
      if (!f) { toast.show('جارٍ تجهيز الملف، حاول مرة أخرى', 'error'); return; }

      // Synchronous: the file is ready and the tap gesture is still live.
      // No canShare gate — some Android browsers report false yet share fine.
      if (navigator.share) {
        navigator.share({ title, files: [f] })
          .catch((err: Error) => {
            if (err?.name === 'AbortError') return; // user backed out
            void download(f); // genuine failure → last resort
          });
        return;
      }
      void download(f); // no Web Share API at all (e.g. desktop)
      return;
    }

    // Link mode (products, etc.).
    setBusy(true);
    void (async () => {
      try {
        const data: ShareData = { title, text, url: shareUrl };
        if (navigator.share) {
          try { await navigator.share(data); return; }
          catch (err) { if ((err as Error)?.name === 'AbortError') return; }
        }
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`.trim());
        setCopied(true);
        toast.show('تم نسخ الرابط', 'success');
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.show('تعذّر تحضير المحتوى للمشاركة', 'error');
      } finally {
        setBusy(false);
      }
    })();
  };

  const disabled = busy || (!!order && !ready);

  return (
    <button className={`btn btn-outline btn-sm ${className}`} onClick={share} disabled={disabled}>
      {busy || (!!order && !ready) ? <Loader2 size={15} className="spin" />
        : copied ? <Check size={15} />
        : order ? <FileDown size={15} />
        : <Share2 size={15} />}
      {busy || (!!order && !ready) ? 'جارٍ التحضير...' : compact ? 'مشاركة' : order ? 'مشاركة PDF' : 'مشاركة'}
      {!order && !busy && <Link2 size={13} style={{ opacity: .6 }} />}
    </button>
  );
}
