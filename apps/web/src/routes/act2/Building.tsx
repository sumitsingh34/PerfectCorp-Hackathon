import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession } from "@/store/session";
import { EVENTS } from "@/lib/event-templates";
import { runHair, runMakeup, runClothes, runAccessory } from "@/lib/perfect";
import { speak } from "@/lib/voice";

const STAGES = [
  { key: "hair",      label: "Styling your hair…" },
  { key: "makeup",    label: "Painting tone-matched makeup…" },
  { key: "clothes",   label: "Fitting the outfit…" },
  { key: "accessory", label: "Adding the finishing piece…" },
] as const;

export default function Building() {
  const nav = useNavigate();
  const { event, skinTone, setHair, setMakeup, setClothes, setAccessory } = useSession();
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!event) { nav("/event"); return; }
    if (startedRef.current) return;
    startedRef.current = true;
    speak("Building your look.");

    const tpl = EVENTS[event];
    (async () => {
      try {
        setStage(0);
        const hair = await runHair(tpl.hairReferenceUrl, tpl.hairStyleName);
        setHair(hair);

        setStage(1);
        const makeup = await runMakeup(tpl.makeupLookId);
        setMakeup(makeup);

        setStage(2);
        const clothes = await runClothes(tpl.garmentId);
        setClothes(clothes);

        setStage(3);
        const acc = await runAccessory(tpl.accessory.category, tpl.accessory.itemId);
        setAccessory(acc);

        nav("/lookbook");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Look build failed");
      }
    })();
    // skinTone is read but not directly used in calls (palette-driven via lookId/garmentId);
    // referenced here so future tone-aware overrides have a hook.
    void skinTone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center text-center">
      <div className="display text-3xl">Composing</div>
      <div className="mt-2 text-sm text-white/80">{event && EVENTS[event].title}</div>

      <ol className="mt-8 w-full max-w-xs space-y-3">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={s.key}
                className={"glass p-3 flex items-center gap-3 transition " +
                  (active ? "ring-2 ring-glow-500" : done ? "opacity-70" : "opacity-40")}>
              <span className={"grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold " +
                (done ? "bg-care-500 text-ink-950" : active ? "bg-glow-500 text-ink-950" : "bg-white/10")}>
                {done ? "✓" : i + 1}
              </span>
              <span className="text-sm">{s.label}</span>
              {active && (
                <motion.span
                  className="ml-auto h-2 w-2 rounded-full bg-glow-300"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mt-6 max-w-xs">
          <p className="text-glow-300 text-sm">{error}</p>
          <button onClick={() => nav("/event")} className="btn-ghost mt-3">Pick another moment</button>
        </div>
      )}
    </section>
  );
}
