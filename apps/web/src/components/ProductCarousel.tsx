import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Plus } from "lucide-react";
import type { Product } from "@/data/products-skin";
import type { FashionItem } from "@/data/products-fashion";
import { cn } from "@/lib/cn";

type Item = Product | FashionItem;

function isProduct(i: Item): i is Product {
  return (i as Product).step !== undefined;
}

export default function ProductCarousel({
  items,
  selectable,
  selectedIds,
  onToggle,
}: {
  items: Item[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  function update() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [items.length]);

  function scrollBy(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll by roughly one card (w-44 = 176px) + gap (12px).
    el.scrollBy({ left: dir * 188, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div ref={scrollerRef} className="-mx-5 px-5 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-3 min-w-max">
          {items.map((p) => {
            const selected = selectedIds?.has(p.id) ?? false;
            return (
              <article
                key={p.id}
                className={cn(
                  "glass w-44 shrink-0 p-3 relative transition",
                  selectable && (selected ? "ring-2 ring-glow-500" : "opacity-70"),
                )}
              >
                {selectable && (
                  <button
                    type="button"
                    onClick={() => onToggle?.(p.id)}
                    aria-label={selected ? `Remove ${p.name}` : `Add ${p.name}`}
                    className={cn(
                      "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border transition active:scale-95 z-10",
                      selected
                        ? "bg-glow-500 border-glow-500 text-white"
                        : "bg-ink-900/80 border-white/25 text-white",
                    )}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                )}
                <div className="grid h-24 w-full place-items-center rounded-2xl bg-white/5 text-4xl">
                  {p.hero}
                </div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/65">{p.brand}</div>
                  <div className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="display text-lg">${p.price}</span>
                    {isProduct(p) && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-wider">
                        {p.step}
                      </span>
                    )}
                  </div>
                  {isProduct(p) && (
                    <p className="mt-2 text-[11px] text-white/65 leading-snug">{p.why}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Previous"
        disabled={!canPrev}
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full",
          "bg-ink-900/85 border border-white/15 backdrop-blur-md transition shadow-soft",
          canPrev ? "opacity-100 active:scale-95" : "opacity-0 pointer-events-none",
        )}
      >
        <ChevronLeft className="h-4 w-4 text-white" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Next"
        disabled={!canNext}
        className={cn(
          "absolute -right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full",
          "bg-ink-900/85 border border-white/15 backdrop-blur-md transition shadow-soft",
          canNext ? "opacity-100 active:scale-95" : "opacity-0 pointer-events-none",
        )}
      >
        <ChevronRight className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}
