import { forwardRef } from "react";
import type { SkinAnalysisResult, AgingResult, SkinSimulationResult, ClothesResult } from "@/lib/perfect";

/**
 * The exportable artifact. Sized for Instagram Story (1080×1920) when
 * rendered via html-to-image at pixelRatio 2 from a 540×960 DOM.
 */
const ShareCard = forwardRef<HTMLDivElement, {
  futureLeft?: string;
  futureRight?: string;
  todayLook?: string;
  topConcernLabels: string[];
  eventTitle?: string;
}>(function ShareCard({ futureLeft, futureRight, todayLook, topConcernLabels, eventTitle }, ref) {
  return (
    <div
      ref={ref}
      className="bg-ink-950 text-glow-50 font-sans overflow-hidden"
      style={{ width: 540, height: 960, padding: 24 }}
    >
      <div className="h-full w-full rounded-[28px] bg-gradient-aurora p-1 overflow-hidden">
        <div className="h-full w-full rounded-[24px] bg-ink-900/85 backdrop-blur-xl p-5 flex flex-col gap-4">
          <header className="flex items-center justify-between">
            <div className="display text-2xl">Glow Forecast</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/65">
              powered by perfect corp
            </div>
          </header>

          <section>
            <div className="text-xs uppercase tracking-widest text-white/65 mb-2">Future You · 10 yrs</div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
              <div className="aspect-[3/4] bg-white/5 grid place-items-center">
                {futureLeft ? <img src={futureLeft} className="h-full w-full object-cover" /> : <span className="text-xs">Without care</span>}
              </div>
              <div className="aspect-[3/4] bg-white/5 grid place-items-center">
                {futureRight ? <img src={futureRight} className="h-full w-full object-cover" /> : <span className="text-xs">With care</span>}
              </div>
            </div>
          </section>

          <section className="flex-1 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-white/65 mb-2">
              Today You{eventTitle ? ` · ${eventTitle}` : ""}
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden bg-white/5 grid place-items-center">
              {todayLook ? <img src={todayLook} className="h-full w-full object-cover" /> : <span className="text-xs">Lookbook preview</span>}
            </div>
          </section>

          <section>
            <div className="text-xs uppercase tracking-widest text-white/65 mb-1">Top concerns to address</div>
            <div className="flex flex-wrap gap-1.5">
              {topConcernLabels.map((c) => (
                <span key={c} className="rounded-full bg-glow-500/20 border border-glow-500/40 px-2.5 py-1 text-xs">
                  {c}
                </span>
              ))}
            </div>
          </section>

          <footer className="text-center text-[11px] text-white/55">
            glow-forecast.app · made for the Pegasus × Perfect Corp hackathon
          </footer>
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
