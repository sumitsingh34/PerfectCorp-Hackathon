import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, CheckSquare, Square } from "lucide-react";
import ProductCarousel from "@/components/ProductCarousel";
import BackButton from "@/components/BackButton";
import { useSession } from "@/store/session";
import { recommendedFor, SKIN_PRODUCTS } from "@/data/products-skin";
import { speak } from "@/lib/voice";
import { useCart } from "@/store/cart";
import { toast } from "@/components/Toast";

export default function Routine() {
  const nav = useNavigate();
  const { skinAnalysis } = useSession();
  const items = useMemo(() => recommendedFor(skinAnalysis?.top3 ?? []), [skinAnalysis]);
  const cartItems = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const cartIds = useMemo(() => new Set(cartItems.map((i) => i.id)), [cartItems]);

  useEffect(() => {
    if (!skinAnalysis) { nav("/capture"); return; }
    speak("Tap any product to add or remove from your cart instantly.");
  }, [skinAnalysis, nav]);

  if (!skinAnalysis) return null;

  const inCartIds = new Set(items.filter((i) => cartIds.has(i.id)).map((i) => i.id));
  const allInCart = inCartIds.size === items.length;
  const total = items.filter((i) => cartIds.has(i.id)).reduce((s, i) => s + i.price, 0);

  function toggle(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (cartIds.has(id)) {
      remove(id);
      toast(`Removed ${item.name}`);
    } else {
      add({ id: item.id, name: item.name, brand: item.brand, price: item.price, hero: item.hero, category: "skincare" });
      toast(`Added ${item.name}`);
    }
  }

  function toggleAll() {
    if (allInCart) {
      items.forEach((i) => remove(i.id));
      toast("Removed all from cart");
    } else {
      const adding = items.filter((i) => !cartIds.has(i.id));
      adding.forEach((i) => add({ id: i.id, name: i.name, brand: i.brand, price: i.price, hero: i.hero, category: "skincare" }));
      toast(`Added ${adding.length} to cart`);
    }
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/forecast" />
        <h2 className="display text-3xl">Your routine</h2>
      </div>
      <p className="text-sm text-white/80">
        Tap any card to add or remove from your cart instantly.
      </p>

      <div className="mt-3 flex justify-end">
        <button onClick={toggleAll} className="btn-ghost text-xs">
          {allInCart ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allInCart ? "Remove all" : "Add all"}
        </button>
      </div>

      <div className="mt-2">
        <ProductCarousel
          items={items}
          selectable
          selectedIds={inCartIds}
          onToggle={toggle}
        />
      </div>

      <div className="mt-6 glass p-3 flex items-center justify-between text-sm">
        <span className="text-white/70">{inCartIds.size} of {items.length} in cart</span>
        <span className="display text-2xl">${total}</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {(["AM", "PM"] as const).map((step) => (
          <div key={step} className="glass p-3">
            <div className="display text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {step} ritual
            </div>
            <ol className="mt-2 space-y-1 text-xs text-white/85 list-decimal list-inside">
              {skinAnalysis.top3.flatMap((k) =>
                (SKIN_PRODUCTS[k] || []).filter((p) => p.step === step || p.step === "BOTH").slice(0, 1).map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))
              )}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="glass p-4">
          {useSession.getState().mode === "future" ? (
            <>
              <div className="display text-xl">All set.</div>
              <p className="text-sm text-white/80 mt-1">
                You picked Future You only. Save your Glow Card to share or revisit later.
              </p>
              <Link to="/share" className="btn-primary mt-4 w-full">
                Make my Glow Card <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <div className="display text-xl">Now, today.</div>
              <p className="text-sm text-white/80 mt-1">
                You've seen the long game. Let's pick a moment and style you for it.
              </p>
              <Link to="/event" className="btn-primary mt-4 w-full">
                Start Act 2 - Today You <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/share" className="text-xs text-white/65 hover:text-white/90 mt-3 inline-flex items-center gap-1 mx-auto justify-center w-full">
                Skip Act 2 · save my Glow Card now
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
