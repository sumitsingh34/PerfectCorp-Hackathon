import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import EventCard from "@/components/EventCard";
import BackButton from "@/components/BackButton";
import { EVENT_LIST, type EventKey } from "@/lib/event-templates";
import { useSession } from "@/store/session";
import { speak } from "@/lib/voice";

export default function EventPick() {
  const nav = useNavigate();
  const { event, setEvent } = useSession();
  const [picked, setPicked] = useState<EventKey | null>(event);

  useEffect(() => {
    speak("Pick a moment. Your tone and palette carry over from Act 1.");
  }, []);

  function go() {
    if (!picked) return;
    setEvent(picked);
    nav("/building");
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/routine" />
        <h2 className="display text-3xl">What's next?</h2>
      </div>
      <p className="text-sm text-white/80">
        We'll build a coordinated head-to-toe look for it.
      </p>

      <div className="mt-5 grid gap-3">
        {EVENT_LIST.map((e) => (
          <EventCard
            key={e.key}
            event={e}
            selected={picked === e.key}
            onSelect={() => setPicked(e.key)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link to="/share" className="btn-ghost text-xs">
          Skip · save card
        </Link>
        <button onClick={go} className="btn-primary" disabled={!picked}>
          Build the look <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
