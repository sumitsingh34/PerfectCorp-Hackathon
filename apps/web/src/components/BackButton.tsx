import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function BackButton({ to }: { to?: string }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => (to ? nav(to) : nav(-1))}
      aria-label="Go back"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/80 border border-white/10 backdrop-blur-md transition active:scale-95 hover:bg-ink-800"
    >
      <ChevronLeft className="h-5 w-5 text-white" />
    </button>
  );
}
