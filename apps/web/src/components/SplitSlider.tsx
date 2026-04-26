import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Draggable split-screen image reveal. Left side = "neglect" image, right side
 * = "care" image. Drag the central handle to compare. The signature visual of
 * Act 1 — keep the interaction frictionless and the visual transition crisp.
 */
export default function SplitSlider({
  leftSrc,
  rightSrc,
  leftLabel = "Without care",
  rightLabel = "With care",
  className,
  initial = 0.5,
}: {
  leftSrc: string;
  rightSrc: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  initial?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setWidth(w);
      x.set(w * initial);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [x, initial]);

  // Auto-pulse on first mount to suggest interactivity.
  useEffect(() => {
    if (width <= 0) return;
    const ctrl = animate(x, [width * 0.5, width * 0.66, width * 0.34, width * 0.5], {
      duration: 2.4, ease: "easeInOut",
    });
    return () => ctrl.stop();
  }, [width, x]);

  const clipPath = useTransform(x, (v) => `inset(0 0 0 ${v}px)`);

  const onPointer = useCallback((e: React.PointerEvent) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const next = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    x.set(next);
  }, [x]);

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointer}
      onPointerMove={(e) => e.buttons === 1 && onPointer(e)}
      className={cn("relative w-full max-h-[58vh] overflow-hidden rounded-2xl select-none touch-none mx-auto", className)}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Left (neglect) */}
      {leftSrc ? (
        <img src={leftSrc} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="absolute inset-0 skeleton" />
      )}
      {/* Right (care) clipped */}
      <motion.div className="absolute inset-0" style={{ clipPath }}>
        {rightSrc ? (
          <img src={rightSrc} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="absolute inset-0 skeleton" />
        )}
      </motion.div>

      {/* Labels */}
      <span className="absolute left-3 top-3 rounded-full bg-future-500/85 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-soft">
        {leftLabel}
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-care-500/85 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-soft">
        {rightLabel}
      </span>

      {/* Handle */}
      <motion.div
        style={{ x }}
        className="absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.6)]"
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid h-12 w-12 place-items-center rounded-full bg-white text-ink-950 shadow-glow ring-4 ring-white/30">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M9 6 3 12l6 6M15 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
