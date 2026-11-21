import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Check, X, Loader2 } from 'lucide-react';

/**
 * Slide-to-confirm, RTL-first, rebuilt from the 21st.dev concept in the app's
 * own CSS (no Tailwind / external dependency).
 *
 * Performance: during a drag the knob/fill/labels are painted directly on the
 * DOM from the pointer event. React state is only touched on pointer-down and
 * on release, so a fast swipe stays at the display's frame rate instead of
 * re-rendering the whole dialog on every pointermove.
 */
interface Props {
  onConfirm: () => void | Promise<void>;
  label?: string;
  successLabel?: string;
  tone?: 'danger' | 'primary';
  disabled?: boolean;
}

type Phase = 'idle' | 'dragging' | 'working' | 'success' | 'error';

const THRESHOLD = 0.82;
const KNOB = 46;

export function SwipeConfirm({
  onConfirm,
  label = 'اسحب للتأكيد',
  successLabel = 'تم التنفيذ',
  tone = 'danger',
  disabled = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);

  const progressRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const drag = useRef<{ startX: number; startProgress: number; width: number } | null>(null);

  const updatePhase = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const maxOffset = () => Math.max(0, (trackRef.current?.clientWidth || 240) - KNOB - 8);

  /** Paint the current progress straight to the DOM — no React render. */
  const paint = useCallback((p: number) => {
    progressRef.current = p;
    const px = Math.max(0, Math.min(1, p)) * maxOffset();
    if (knobRef.current) knobRef.current.style.insetInlineStart = `${px}px`;
    if (fillRef.current) fillRef.current.style.width = `${px + KNOB}px`;
    // Label fades out first; the white hint only appears afterwards so the two
    // never overlap (they occupy the same absolute position).
    if (labelRef.current) labelRef.current.style.opacity = String(Math.max(0, 1 - p * 6));
    if (hintRef.current) hintRef.current.style.opacity = String(Math.min(1, Math.max(0, (p - 0.22) * 5)));
  }, []);

  /** Force the status label visible and the drag hint hidden (terminal states). */
  const showStatusText = useCallback(() => {
    if (labelRef.current) labelRef.current.style.opacity = '1';
    if (hintRef.current) hintRef.current.style.opacity = '0';
  }, []);

  const vibrate = (pattern: number | number[]) => {
    try { (navigator.vibrate as ((p: number | number[]) => boolean) | undefined)?.(pattern); } catch { /* optional */ }
  };

  const setFromClientX = useCallback((clientX: number) => {
    const d = drag.current;
    if (!d) return;
    // RTL: moving the pointer left (smaller clientX) increases progress.
    const delta = d.startX - clientX;
    const raw = d.startProgress + delta / Math.max(1, d.width);
    const clamped = raw < 0 ? raw * 0.25 : raw > 1 ? 1 + (raw - 1) * 0.25 : raw; // rubber band
    paint(Math.min(1.05, Math.max(-0.05, clamped)));
  }, [paint]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || phaseRef.current === 'working' || phaseRef.current === 'success') return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startProgress: progressRef.current, width: maxOffset() };
    updatePhase('dragging'); // one render: adds .is-dragging which disables transitions
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (phaseRef.current === 'dragging') setFromClientX(e.clientX);
  };

  const commit = useCallback(async () => {
    paint(1);
    updatePhase('working');
    showStatusText();
    vibrate(18);
    try {
      await onConfirm();
      updatePhase('success');
      showStatusText();
      vibrate([12, 40, 24]);
      window.setTimeout(() => { paint(0); updatePhase('idle'); }, 1100);
    } catch {
      updatePhase('error');
      showStatusText();
      vibrate([40, 60, 40]);
      window.setTimeout(() => { paint(0); updatePhase('idle'); }, 600);
    }
  }, [onConfirm, paint, showStatusText]);

  const onPointerUp = () => {
    if (phaseRef.current !== 'dragging') return;
    drag.current = null;
    if (progressRef.current >= THRESHOLD) void commit();
    else { paint(0); updatePhase('idle'); } // transitions re-enabled → springs back
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || phaseRef.current === 'working' || phaseRef.current === 'success') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); paint(Math.min(1, progressRef.current + 0.2)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); paint(Math.max(0, progressRef.current - 0.2)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void commit(); }
  };

  useEffect(() => {
    if (disabled) { paint(0); updatePhase('idle'); }
  }, [disabled, paint]);

  const state = phase === 'working' || phase === 'success' || phase === 'error' ? phase : 'idle';
  // Initial inline styles only; subsequent drag updates are painted directly.
  const initialOffset = 0;

  return (
    <div
      ref={trackRef}
      className={`swipe-track tone-${tone} is-${state} ${phase === 'dragging' ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
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
      <span ref={fillRef} className="swipe-fill" style={{ width: initialOffset + KNOB }} />
      <span ref={labelRef} className="swipe-label" style={{ opacity: 1 }}>
        {phase === 'success' ? successLabel : phase === 'working' ? 'جارٍ التنفيذ...' : label}
      </span>
      <span ref={hintRef} className="swipe-hint" style={{ opacity: 0 }}>أكمل السحب</span>
      <span ref={knobRef} className="swipe-knob" style={{ insetInlineStart: initialOffset }}>
        {phase === 'working' ? <Loader2 size={20} className="spin" />
          : phase === 'success' ? <Check size={22} strokeWidth={3} />
          : phase === 'error' ? <X size={20} strokeWidth={3} />
          : <ChevronLeft size={22} strokeWidth={2.5} />}
      </span>
    </div>
  );
}
