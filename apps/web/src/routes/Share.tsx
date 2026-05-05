import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Share2, Sparkles } from "lucide-react";
import ShareCard from "@/components/ShareCard";
import BackButton from "@/components/BackButton";
import { toast } from "@/components/Toast";
import { useSession } from "@/store/session";
import { exportCard, shareCard } from "@/lib/share-card";
import { EVENTS } from "@/lib/event-templates";

const CARD_W = 540;
const CARD_H = 960;

export default function Share() {
  const nav = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [busy, setBusy] = useState(false);

  // Fit the card to whatever width the wrapper has.
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(Math.min(1, w / CARD_W));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const { skinAnalysis, aging, skinSimulation, hair, makeup, clothes, accessory, selfie, event } = useSession();

  // Pick the best "Today You" preview: prefer the most-transformed real result,
  // skip any demo SVG fallback (which lives under /demo/ and would render as a
  // generic placeholder figure, not the user's actual face).
  const isReal = (url?: string) => !!url && !url.startsWith("/demo/");
  const todayLook =
    [accessory?.previewUrl, clothes?.previewUrl, makeup?.previewUrl, hair?.previewUrl].find(isReal)
    ?? selfie?.previewUrl;

  const concernLabels =
    skinAnalysis?.top3.map((k) => skinAnalysis.concerns.find((c) => c.key === k)?.label || k) ?? [];

  async function handleDownload() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      await exportCard(cardRef.current);
      toast("Saved · check your downloads");
    } catch (e) {
      console.error("[share] save failed:", e);
      const detail = e instanceof Error ? e.message.slice(0, 80) : "unknown error";
      toast(`Couldn't save · ${detail}`);
    } finally { setBusy(false); }
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const shared = await shareCard(cardRef.current);
      if (shared) toast("Shared!");
      else { await exportCard(cardRef.current); toast("No share sheet here · downloaded instead"); }
    } catch (e) {
      console.error(e);
      toast("Share failed. Try Save PNG.");
    } finally { setBusy(false); }
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/shop" />
        <h2 className="display text-3xl">Your Glow Card</h2>
      </div>
      <p className="text-sm text-white/80">
        Both acts in one shareable image, sized for stories.
      </p>

      <div ref={wrapRef} className="mt-5 mx-auto w-full overflow-hidden rounded-2xl" style={{ height: CARD_H * scale }}>
        <div style={{ transformOrigin: "top left", transform: `scale(${scale})`, width: CARD_W, height: CARD_H, overflow: "hidden" }}>
          <ShareCard
            ref={cardRef}
            futureLeft={aging?.age10Url}
            futureRight={skinSimulation?.improvedUrl}
            todayLook={todayLook}
            topConcernLabels={concernLabels}
            eventTitle={event ? EVENTS[event].title : undefined}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button onClick={handleDownload} disabled={busy} className="btn-ghost">
          <Download className="h-4 w-4" /> {busy ? "Working…" : "Save PNG"}
        </button>
        <button onClick={handleShare} disabled={busy} className="btn-primary">
          <Share2 className="h-4 w-4" /> {busy ? "Working…" : "Share"}
        </button>
      </div>

      <div className="mt-6 glass p-4 text-center">
        <div className="flex justify-center mb-2"><Sparkles className="h-5 w-5 text-glow-300" /></div>
        <p className="text-sm text-white/85">
          Powered by 8 Perfect Corp YouCam APIs across one selfie.
        </p>
        <button onClick={() => nav("/")} className="btn-ghost mt-4">Start over</button>
      </div>
    </section>
  );
}
