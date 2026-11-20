import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import { useToast } from './Toast';

/**
 * Share any object (order, product, report, ...) via the device's native share
 * sheet. Falls back to copying the text/link to the clipboard when the Web
 * Share API is unavailable (e.g. desktop browsers without a share target).
 */
interface Props {
  title: string;
  text: string;
  url?: string;
  className?: string;
  compact?: boolean;
}

export function ShareButton({ title, text, url, className = '', compact = false }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const share = async () => {
    const data: ShareData = { title, text, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch (err) {
      // Aborting the native sheet is not an error worth bothering the user.
      if ((err as Error)?.name === 'AbortError') return;
    }
    // Fallback: copy a readable text + link to the clipboard.
    const payload = `${text}\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.show('تم نسخ المحتوى للحافظة', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show('تعذّر المشاركة على هذا الجهاز', 'error');
    }
  };

  return (
    <button className={`btn btn-outline btn-sm ${className}`} onClick={() => void share()}>
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {compact ? 'مشاركة' : 'مشاركة'}
      <Link2 size={13} style={{ opacity: .6 }} />
    </button>
  );
}
