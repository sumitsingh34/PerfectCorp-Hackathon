import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession } from "@/store/session";
import { runSkinAnalysis, runSkinTone } from "@/lib/perfect";
import { speak } from "@/lib/voice";

const STAGES_FULL = [
  "Mapping facial geometry…",
  "Reading texture and pores…",
  "Measuring radiance and tone…",
  "Composing your forecast…",
];
const STAGES_TONE = [
  "Reading skin tone…",
  "Sampling lip and eye colors…",
  "Building your palette…",
];

export default function Analyzing() {
  const nav = useNavigate();
  const selfie = useSession((s) => s.selfie);
  const mode = useSession((s) => s.mode);
  const setSkinAnalysis = useSession((s) => s.setSkinAnalysis);
  const setSkinTone = useSession((s) => s.setSkinTone);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // In "today" mode we only need skin-tone (drives the makeup palette);
  // skip the heavier skin-analysis call to save units and time.
  const todayOnly = mode === "today";
  const STAGES = todayOnly ? STAGES_TONE : STAGES_FULL;

  useEffect(() => {
    if (!selfie) { nav("/capture"); return; }
    if (startedRef.current) return;
    startedRef.current = true;

    speak(todayOnly
      ? "Reading your tone to build today's look."
      : "Analyzing your skin. This will take just a moment.");
    const tick = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1600);

    const work = todayOnly
      ? runSkinTone().then((tone) => { setSkinTone(tone); nav("/event"); })
      : Promise.all([runSkinAnalysis(), runSkinTone()]).then(([analysis, tone]) => {
          setSkinAnalysis(analysis);
          setSkinTone(tone);
          nav("/diagnosis");
        });

    work
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Analysis failed"))
      .finally(() => clearInterval(tick));

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center text-center">
      {selfie && (
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative aspect-[3/4] w-64 overflow-hidden rounded-3xl shadow-glow"
        >
          <img src={selfie.previewUrl} alt="" className="h-full w-full object-cover" />
          <motion.div
            className="absolute inset-x-0 h-12 bg-gradient-to-b from-glow-500/0 via-glow-500/35 to-glow-500/0"
            animate={{ y: [0, 320, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
      <motion.p
        key={stage}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 display text-xl"
      >
        {STAGES[stage]}
      </motion.p>
      {error && (
        <div className="mt-6 max-w-xs">
          <p className="text-glow-300 text-sm">{error}</p>
          <button onClick={() => nav("/capture")} className="btn-ghost mt-3">Try again</button>
        </div>
      )}
    </section>
  );
}
