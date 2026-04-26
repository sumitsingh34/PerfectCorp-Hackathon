import { motion } from "framer-motion";
import type { EventTemplate } from "@/lib/event-templates";
import { cn } from "@/lib/cn";

export default function EventCard({
  event,
  selected,
  onSelect,
}: {
  event: EventTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const [a, b, c] = event.paletteHint;
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative w-full text-left rounded-3xl p-4 glass overflow-hidden transition",
        selected && "ring-2 ring-glow-500 shadow-glow",
      )}
    >
      <div className="absolute inset-0 opacity-30 transition group-hover:opacity-50"
           style={{ background: `linear-gradient(135deg, ${a}, ${b}, ${c})` }} />
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl">
          {event.emoji}
        </span>
        <div className="flex-1">
          <div className="display text-lg leading-tight">{event.title}</div>
          <div className="text-xs text-white/80 mt-1 line-clamp-2">{event.blurb}</div>
        </div>
        {selected && (
          <span className="rounded-full bg-glow-500 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
            PICKED
          </span>
        )}
      </div>
    </motion.button>
  );
}
