import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, CreditCard, CheckCircle2, Minus, Plus } from "lucide-react";
import { useCart, cartTotal, cartCount } from "@/store/cart";

export default function CartDrawer() {
  const { items, drawerOpen, setDrawer, remove, clear, inc, dec } = useCart();
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "processing" | "done">("idle");

  // Lock body scroll while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  function checkout() {
    if (items.length === 0) return;
    setCheckoutStep("processing");
    setTimeout(() => {
      setCheckoutStep("done");
      setTimeout(() => {
        clear();
        setCheckoutStep("idle");
        setDrawer(false);
      }, 1600);
    }, 900);
  }

  const total = cartTotal(items);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-ink-950 border-l border-white/10 flex flex-col"
            style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
          >
            <header className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="display text-2xl">Your cart</h3>
              <button onClick={() => setDrawer(false)} aria-label="Close cart" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </header>

            {checkoutStep === "done" ? (
              <div className="flex-1 grid place-items-center text-center px-6">
                <div>
                  <CheckCircle2 className="h-16 w-16 text-care-500 mx-auto" />
                  <div className="display text-2xl mt-4">Order placed</div>
                  <p className="text-sm text-white/70 mt-2">Mock confirmation #GF-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex-1 grid place-items-center text-center px-6">
                <div>
                  <div className="text-4xl mb-3">🛒</div>
                  <div className="display text-xl">Cart is empty</div>
                  <p className="text-sm text-white/65 mt-2">Add items from the routine or shop pages.</p>
                </div>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto p-5 space-y-3">
                {items.map((it) => (
                  <li key={it.id} className="glass p-3 flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl">{it.hero}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-white/60">{it.brand}</div>
                      <div className="text-sm font-semibold leading-tight truncate">{it.name}</div>
                      <div className="text-xs text-white/65 mt-0.5">${it.price} each</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="display text-base tabular-nums">${it.price * it.qty}</div>
                      <div className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 p-0.5">
                        <button
                          onClick={() => dec(it.id)}
                          aria-label={`Decrease ${it.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10 text-white/85 active:scale-90 transition"
                        >
                          {it.qty <= 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="display text-sm tabular-nums w-5 text-center">{it.qty}</span>
                        <button
                          onClick={() => inc(it.id)}
                          aria-label={`Increase ${it.name}`}
                          disabled={it.qty >= 99}
                          className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10 text-white/85 active:scale-90 transition disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => remove(it.id)} aria-label={`Remove ${it.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-glow-500/30 text-white/70 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {checkoutStep !== "done" && items.length > 0 && (
              <footer className="p-5 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-white/65">
                    {cartCount(items)} {cartCount(items) === 1 ? "item" : "items"}
                  </div>
                  <div className="display text-3xl">${total}</div>
                </div>
                <button
                  onClick={checkout}
                  disabled={checkoutStep === "processing"}
                  className="btn-primary w-full"
                >
                  {checkoutStep === "processing" ? (
                    <>Processing…</>
                  ) : (
                    <><CreditCard className="h-4 w-4" /> Mock checkout · ${total}</>
                  )}
                </button>
                <button onClick={clear} className="text-xs text-white/55 hover:text-white/80 mx-auto block">
                  Clear cart
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
