import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

type ToastState = {
  message: string | null;
  show: (msg: string, ms?: number) => void;
  hide: () => void;
};
const store = create<ToastState>((set) => ({
  message: null,
  show: (message, ms = 2400) => {
    set({ message });
    if (ms > 0) setTimeout(() => set((s) => (s.message === message ? { message: null } : s)), ms);
  },
  hide: () => set({ message: null }),
}));

export const toast = (msg: string, ms?: number) => store.getState().show(msg, ms);

export function ToastHost() {
  const message = store((s) => s.message);
  const hide = store((s) => s.hide);
  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [message, hide]);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] px-4 py-2.5 rounded-full bg-ink-900/95 border border-white/15 text-sm shadow-soft max-w-[90vw] text-center"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
