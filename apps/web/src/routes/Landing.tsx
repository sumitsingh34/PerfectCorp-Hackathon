import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Volume2, VolumeX, Wand2, Telescope, Shirt } from "lucide-react";
import { useSession } from "@/store/session";
import type { JourneyMode } from "@/store/session";

const MODES: { key: JourneyMode; title: string; blurb: string; emoji: React.ReactNode; tone: string }[] = [
  {
    key: "full",
    title: "Full journey",
    blurb: "Future skin + today's full look. 8 AI models. ~90 seconds.",
    emoji: <Wand2 className="h-5 w-5" />,
    tone: "from-glow-500 to-future-500",
  },
  {
    key: "future",
    title: "Future You only",
    blurb: "Skin diagnosis, +10yr forecast, personalized routine. Skip styling.",
    emoji: <Telescope className="h-5 w-5" />,
    tone: "from-future-500 to-care-500",
  },
  {
    key: "today",
    title: "Today You only",
    blurb: "Skip the science. Pick a moment, get a coordinated head-to-toe look.",
    emoji: <Shirt className="h-5 w-5" />,
    tone: "from-glow-500 to-glow-700",
  },
];

export default function Landing() {
  const nav = useNavigate();
  const { voiceEnabled, setVoice, demoMode, setDemo, setMode } = useSession();

  function start(mode: JourneyMode) {
    setMode(mode);
    nav("/capture");
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-aurora shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="display text-lg">Glow Forecast</span>
        </div>
        <button
          onClick={() => setVoice(!voiceEnabled)}
          className="btn-ghost text-xs"
          aria-label={voiceEnabled ? "Disable narration" : "Enable narration"}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {voiceEnabled ? "Voice on" : "Voice off"}
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="flex-1 flex flex-col justify-center"
      >
        <h1 className="display text-5xl leading-[1.05] sm:text-6xl">
          See your <span className="text-glow-300">future skin</span>.
          <br />
          Style your <span className="text-care-300">today look</span>.
        </h1>
        <p className="mt-4 text-white/80 text-base leading-relaxed">
          One selfie. Eight Perfect Corp AI models. Pick how deep to go.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {MODES.map((m, i) => (
            <motion.button
              key={m.key}
              onClick={() => start(m.key)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.06 }}
              className="group relative w-full text-left rounded-2xl p-4 glass overflow-hidden transition active:scale-[0.99]"
            >
              <div className={`absolute inset-0 opacity-25 bg-gradient-to-br ${m.tone} group-hover:opacity-40 transition`} />
              <div className="relative flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white">
                  {m.emoji}
                </span>
                <div className="flex-1">
                  <div className="display text-base leading-tight">{m.title}</div>
                  <div className="text-xs text-white/75 mt-0.5">{m.blurb}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <label className="mt-5 flex items-center justify-center gap-2 text-xs text-white/65 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-glow-500"
            checked={demoMode}
            onChange={(e) => setDemo(e.target.checked)}
          />
          Demo Mode (uses pre-baked results, skips API)
        </label>

        <ul className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { n: "8", l: "AI models" },
            { n: "2", l: "acts" },
            { n: "<2m", l: "to wow" },
          ].map((s) => (
            <li key={s.l} className="glass p-3">
              <div className="display text-2xl text-white">{s.n}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/90">{s.l}</div>
            </li>
          ))}
        </ul>
      </motion.div>

      <footer className="pt-6 text-center text-[11px] text-white/45">
        Pegasus × Perfect Corp Hackathon · 2026
      </footer>
    </section>
  );
}
