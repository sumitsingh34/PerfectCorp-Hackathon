import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import LookLayer from "@/components/LookLayer";
import BackButton from "@/components/BackButton";
import { useSession } from "@/store/session";
import { EVENTS } from "@/lib/event-templates";
import { speak } from "@/lib/voice";

const LABELS = ["You", "+ Hair", "+ Makeup", "+ Outfit", "+ Accessory"];

export default function Lookbook() {
  const nav = useNavigate();
  const { selfie, hair, makeup, clothes, accessory, event } = useSession();
  const [step, setStep] = useState(0);

  const layers = [
    selfie?.previewUrl,
    hair?.previewUrl,
    makeup?.previewUrl,
    clothes?.previewUrl,
    accessory?.previewUrl,
  ];

  useEffect(() => {
    if (!event) { nav("/event"); return; }
    speak("Tap through the layers to reveal each piece.");
  }, [event, nav]);

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/event" />
        <h2 className="display text-3xl">Lookbook</h2>
      </div>
      <p className="text-sm text-white/80">
        {event ? EVENTS[event].title : "Your look"} · tap arrows to layer the reveal
      </p>

      <div className="mt-5">
        <LookLayer images={layers} step={step} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="btn-ghost"
          disabled={step === 0}
          aria-label="Previous layer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <div className="display text-lg">{LABELS[step]}</div>
          <div className="mt-1 flex gap-1.5">
            {LABELS.map((_, i) => (
              <span key={i} className={"h-1.5 w-5 rounded-full transition " +
                (i <= step ? "bg-glow-500" : "bg-white/15")} />
            ))}
          </div>
        </div>
        <button
          onClick={() => setStep((s) => Math.min(LABELS.length - 1, s + 1))}
          className="btn-ghost"
          disabled={step === LABELS.length - 1}
          aria-label="Next layer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-2 text-xs">
        {hair      && <li className="glass p-2"><span className="text-white/55">Hair</span><div className="font-semibold">{hair.styleName}</div></li>}
        {makeup    && <li className="glass p-2"><span className="text-white/55">Makeup</span><div className="font-semibold">{makeup.lookName}</div></li>}
        {clothes   && <li className="glass p-2"><span className="text-white/55">Outfit</span><div className="font-semibold">{clothes.garmentName}</div></li>}
        {accessory && <li className="glass p-2"><span className="text-white/55 capitalize">{accessory.category}</span><div className="font-semibold">{accessory.itemName}</div></li>}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link to="/event" className="btn-ghost">
          <Shuffle className="h-4 w-4" /> Try another moment
        </Link>
        <Link to="/shop" className="btn-primary">
          Shop the look <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
