import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Check, X, Loader2 } from 'lucide-react';

/**
 * Slide-to-confirm, rebuilt RTL-first from the 21st.dev "swipe to confirm"
 * concept in the app's own CSS tokens (no Tailwind / external dependency).
 *
 * The knob starts at the inline-start (right in Arabic) and slides toward the
 * inline-end (left). Drag with mouse or touch, or use the keyboard
 * (ArrowLeft/ArrowRight to move, Enter/Space to confirm). Includes a trailing
 * fill, light haptics, a spinner while the action runs, an error shake on
 * failure and a success check on completion.
 */
interface Props {
  onConfirm: () => void | Promise<void>;
  label?: string;
  successLabel?: string;
  tone?: 'danger' | 'primary';
  disabled?: boolean;
}

type Phase = 'idle' | 'dragging' | 'working' | 'success' | 'error';

const THRESHOLD = 0.82; // fraction of the slide needed to commit

export function SwipeConfirm({
  onConfirm,
  label = 'اسحب للتأكيد',
  successLabel = 'تم التنفيذ',
  tone = 'danger',
  disabled = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  // Keep the live value in a ref too: React may not have flushed the last
  // pointermove state update before pointerup reads it, which would drop a
  // fast, deliberate swipe.
  const progressRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const drag = useRef<{ startX: number; startProgress: number; width: number } | null>(null);

  const updateProgress = (p: number) => { progressRef.current = p; setProgress(p); };
  const updatePhase = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const knobSize = 46;
  const maxOffset = () => Math.max(0, (trackRef.current?.clientWidth || 240) - knobSize - 8);

  const vibrate = (pattern: number | number[]) => {
    try { (navigator.vibrate as ((p: number | number[]) => boolean) | undefined)?.(pattern); } catch { /* haptics are optional */ }
  };

  const setFromClientX = useCallback((clientX: number) => {
    if (!drag.current) return;
    // RTL: moving the pointer left (smaller clientX) increases progress.
    const delta = drag.current.startX - clientX;
    const raw = drag.current.startProgress + delta / Math.max(1, drag.current.width);
    // Rubber band past the ends for a springy feel.
    const clamped = raw < 0 ? raw * 0.25 : raw > 1 ? 1 + (raw - 1) * 0.25 : raw;
    updateProgress(Math.min(1.05, Math.max(-0.05, clamped)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || phaseRef.current === 'working' || phaseRef.current === 'success') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startProgress: progressRef.current, width: maxOffset() };
    updatePhase('dragging');
  };
  const onPointerMove = (e: React.PointerEvent) => { if (phaseRef.current === 'dragging') setFromClientX(e.clientX); };

  const commit = useCallback(async () => {
    updateProgress(1);
    updatePhase('working');
    vibrate(18);
    try {
      await onConfirm();
      updatePhase('success');
      vibrate([12, 40, 24]);
      window.setTimeout(() => { updatePhase('idle'); updateProgress(0); }, 1100);
    } catch {
      updatePhase('error');
      vibrate([40, 60, 40]);
      window.setTimeout(() => { updatePhase('idle'); updateProgress(0); }, 600);
    }
  }, [onConfirm]);

  const onPointerUp = () => {
    if (phaseRef.current !== 'dragging') return;
    drag.current = null;
    if (progressRef.current >= THRESHOLD) void commit();
    else { updatePhase('idle'); updateProgress(0); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || phaseRef.current === 'working' || phaseRef.current === 'success') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); updateProgress(Math.min(1, progressRef.current + 0.2)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); updateProgress(Math.max(0, progressRef.current - 0.2)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void commit(); }
  };

  // Reset if the action was dismissed while mid-drag.
  useEffect(() => {
    if (disabled) { updateProgress(0); updatePhase('idle'); }
  }, [disabled]);

  const offset = Math.max(0, Math.min(1, progress)) * maxOffset();
  const state = phase === 'working' || phase === 'success' || phase === 'error' ? phase : 'idle';

  return (
    <div
      ref={trackRef}
      className={`swipe-track tone-${tone} is-${state} ${disabled ? 'is-disabled' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onKeyDown={onKeyDown}
    >
      <span className="swipe-fill" style={{ width: offset + knobSize }} />
      <span className="swipe-label" style={{ opacity: 1 - Math.min(0.9, progress * 1.1) }}>
        {phase === 'success' ? successLabel : phase === 'working' ? 'جارٍ التنفيذ...' : label}
      </span>
      <span className="swipe-hint" style={{ opacity: Math.min(0.85, progress * 1.4) }}>أكمل السحب</span>
      <span className="swipe-knob" style={{ insetInlineStart: offset }}>
        {phase === 'working' ? <Loader2 size={20} className="spin" />
          : phase === 'success' ? <Check size={22} strokeWidth={3} />
          : phase === 'error' ? <X size={20} strokeWidth={3} />
          : <ChevronLeft size={22} strokeWidth={2.5} />}
      </span>
    </div>
  );
}
