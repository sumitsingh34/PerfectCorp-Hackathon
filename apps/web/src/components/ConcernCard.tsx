import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export default function ConcernCard({
  label,
  score,
  highlight,
  adjustable,
  onChange,
}: {
  label: string;
  score: number;
  highlight?: boolean;
  adjustable?: boolean;
  onChange?: (next: number) => void;
}) {
  // Lower score = more concern; map to color band.
  const tier = score >= 75 ? "good" : score >= 55 ? "ok" : "watch";
  const color =
    tier === "good" ? "from-care-500/25 to-care-700/10 border-care-500/40" :
    tier === "ok"   ? "from-glow-300/25 to-glow-500/10 border-glow-500/40" :
                      "from-future-500/25 to-future-700/10 border-future-500/40";
  const trackColor =
    tier === "good" ? "bg-care-500" : tier === "ok" ? "bg-glow-500" : "bg-future-500";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn("glass border bg-gradient-to-br p-4", color, highlight && "ring-2 ring-glow-500")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{label}</div>
        <div className="display text-2xl tabular-nums">{score}</div>
      </div>
      {adjustable ? (
        <input
          type="range"
          min={0}
          max={100}
          value={score}
          onChange={(e) => onChange?.(Number(e.target.value))}
          aria-label={`Adjust ${label}`}
          className={cn(
            "mt-3 h-2 w-full appearance-none rounded-full bg-white/10 outline-none",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5",
            "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-glow",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-glow-500",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-glow-500",
          )}
          style={{
            background: `linear-gradient(to right, var(--tw-gradient-from, currentColor) 0%, currentColor ${score}%, rgba(255,255,255,0.1) ${score}%)`,
          }}
        />
      ) : (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className={cn("h-full rounded-full", trackColor)} style={{ width: `${score}%` }} />
        </div>
      )}
    </motion.div>
  );
}
