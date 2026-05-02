import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SplitSlider from "@/components/SplitSlider";
import BackButton from "@/components/BackButton";
import { useSession } from "@/store/session";
import { runAging, runSkinSimulation } from "@/lib/perfect";
import { speak } from "@/lib/voice";

export default function Forecast() {
  const nav = useNavigate();
  const { skinAnalysis, aging, skinSimulation, setAging, setSkinSimulation, selfie } = useSession();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!skinAnalysis || !selfie) { nav("/capture"); return; }
    if (startedRef.current) return;
    startedRef.current = true;
    speak("Drag the handle. The left is the path without care. The right is the path with care.");
    Promise.all([runAging(), runSkinSimulation(skinAnalysis.top3)])
      .then(([a, s]) => { setAging(a); setSkinSimulation(s); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Forecast failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/diagnosis" />
        <h2 className="display text-3xl">Your future, two ways</h2>
      </div>
      <p className="text-xs text-white/70">
        Drag the handle - same you, two timelines, +10 years.
      </p>

      <div className="mt-3">
        <SplitSlider
          leftSrc={aging?.age10Url || ""}
          rightSrc={skinSimulation?.improvedUrl || ""}
          leftLabel="Without care"
          rightLabel="With care"
        />
      </div>

      {error && (
        <div className="mt-3 w-[min(92vw,420px)] mx-auto">
          <p className="text-glow-300 text-xs break-all whitespace-pre-wrap max-h-48 overflow-auto rounded bg-black/40 p-2 select-text">
            {error}
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(error).catch(() => {})}
            className="btn-ghost mt-2 text-xs"
          >
            Copy
          </button>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="glass p-2.5">
          <div className="text-future-300 font-semibold">Without care</div>
          <p className="text-white/70 mt-1 leading-snug">Top concerns deepen visibly. Estimate at age +10.</p>
        </div>
        <div className="glass p-2.5">
          <div className="text-care-300 font-semibold">With care</div>
          <p className="text-white/70 mt-1 leading-snug">Targeted routine reverses the same concerns.</p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link to="/routine" className="btn-primary">
          Build my routine <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
