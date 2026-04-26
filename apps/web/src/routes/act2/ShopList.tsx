import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckSquare, Square } from "lucide-react";
import ProductCarousel from "@/components/ProductCarousel";
import BackButton from "@/components/BackButton";
import { useSession } from "@/store/session";
import { FASHION_LOOKS } from "@/data/products-fashion";
import { speak } from "@/lib/voice";
import { useCart } from "@/store/cart";
import { toast } from "@/components/Toast";

export default function ShopList() {
  const nav = useNavigate();
  const { event } = useSession();
  const items = useMemo(() => (event ? FASHION_LOOKS[event] : []), [event]);
  const cartItems = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const cartIds = useMemo(() => new Set(cartItems.map((i) => i.id)), [cartItems]);

  useEffect(() => {
    if (!event) { nav("/event"); return; }
    speak("Tap any piece to add it to or remove it from your cart instantly.");
  }, [event, nav]);

  if (!event) return null;

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
      add({ id: item.id, name: item.name, brand: item.brand, price: item.price, hero: item.hero, category: item.category });
      toast(`Added ${item.name}`);
    }
  }

  function toggleAll() {
    if (allInCart) {
      items.forEach((i) => remove(i.id));
      toast("Removed all from cart");
    } else {
      const adding = items.filter((i) => !cartIds.has(i.id));
      adding.forEach((i) => add({ id: i.id, name: i.name, brand: i.brand, price: i.price, hero: i.hero, category: i.category }));
      toast(`Added ${adding.length} to cart`);
    }
  }

  return (
    <section className="flex min-h-dvh flex-col">
      <div className="screen-header">
        <BackButton to="/lookbook" />
        <h2 className="display text-3xl">Shop the look</h2>
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

      <div className="mt-6 flex justify-end">
        <Link to="/share" className="btn-primary">
          Make my Glow Card <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
