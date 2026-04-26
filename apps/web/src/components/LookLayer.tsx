import { motion, AnimatePresence } from "framer-motion";

/**
 * Crossfade between successive Act 2 reveal stages (base → +hair → +makeup →
 * +outfit → +accessory). Each `images[i]` should be the cumulative composite
 * of all stages up to and including i; `step` selects which one is shown.
 */
export default function LookLayer({
  images,
  step,
  className,
}: {
  images: (string | undefined)[];
  step: number;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(images.length - 1, step));
  const src = images[safe];
  return (
    <div className={"relative w-full overflow-hidden rounded-3xl bg-ink-900 " + (className || "")}
         style={{ aspectRatio: "3/4" }}>
      <AnimatePresence mode="wait">
        {src ? (
          <motion.img
            key={`layer-${safe}`}
            src={src}
            alt=""
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <motion.div
            key="ph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 skeleton"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
