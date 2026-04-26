import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sliders, Check, FastForward } from "lucide-react";
import ConcernCard from "@/components/ConcernCard";
import BackButton from "@/components/BackButton";
import { useSession } from "@/store/session";
import { speak } from "@/lib/voice";

export default function Diagnosis() {
  const nav = useNavigate();
  const { skinAnalysis, skinTone, setSkinAnalysis } = useSession();
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (!skinAnalysis) { nav("/capture"); return; }
    const top = skinAnalysis.top3.map((k) => k.replace("_", " ")).join(", ");
    speak(`Your top areas to address are ${top}. Let's look at how that plays out over time.`);
  }, [skinAnalysis, nav]);

  if (!skinAnalysis) return null;
  const topSet = new Set(skinAnalysis.top3);

  function updateScore(key: string, next: number) {
    if (!skinAnalysis) return;
    const concerns = skinAnalysis.concerns.map((c) =>
      c.key === key ? { ...c, score: next } : c,
    );
    const top3 = [...concerns].sort((a, b) => a.score - b.score).slice(0, 3).map((c) => c.key);
    setSkinAnalysis({ ...skinAnalysis, concerns, top3 });
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/capture" />
        <h2 className="display text-3xl">Your skin, today</h2>
      </div>
      <p className="text-sm text-white/80">
        {adjusting
          ? "Drag any score. The forecast will update for whatever you choose."
          : "Clinical-grade scores across seven concerns. Higher is better."}
      </p>

      {skinTone && (
        <div className="mt-4 glass p-3 flex items-center gap-3">
          <div className="flex -space-x-1">
            <span className="h-6 w-6 rounded-full ring-2 ring-ink-900" style={{ background: skinTone.skinHex }} />
            <span className="h-6 w-6 rounded-full ring-2 ring-ink-900" style={{ background: skinTone.lipHex }} />
            <span className="h-6 w-6 rounded-full ring-2 ring-ink-900" style={{ background: skinTone.eyeHex }} />
            <span className="h-6 w-6 rounded-full ring-2 ring-ink-900" style={{ background: skinTone.hairHex }} />
          </div>
          <div className="text-xs">
            <div className="font-semibold capitalize">{skinTone.undertone} undertone</div>
            <div className="text-white/65">Used to match your makeup + outfit palette</div>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {skinAnalysis.concerns.map((c) => (
          <ConcernCard
            key={c.key}
            label={c.label}
            score={c.score}
            highlight={topSet.has(c.key)}
            adjustable={adjusting}
            onChange={(n) => updateScore(c.key, n)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setAdjusting((a) => !a)}
          className="btn-ghost"
        >
          {adjusting ? <><Check className="h-4 w-4" /> Done</> : <><Sliders className="h-4 w-4" /> Want to adjust?</>}
        </button>
        <Link to="/forecast" className="btn-primary">
          See the forecast <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {useSession.getState().mode === "full" && (
        <div className="mt-3 text-center">
          <Link to="/event" className="text-xs text-white/60 hover:text-white/90 inline-flex items-center gap-1">
            <FastForward className="h-3 w-3" /> Skip to Today You
          </Link>
        </div>
      )}
    </section>
  );
}
