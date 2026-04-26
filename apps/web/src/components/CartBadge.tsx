import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, cartCount } from "@/store/cart";

export default function CartBadge() {
  const { items, setDrawer } = useCart();
  const count = cartCount(items);
  return (
    <button
      onClick={() => setDrawer(true)}
      aria-label={`Cart, ${count} items`}
      className="fixed right-4 top-[calc(theme(spacing.4)+var(--safe-top))] z-40 grid h-11 w-11 place-items-center rounded-full bg-ink-900/90 border border-white/15 backdrop-blur-md shadow-soft active:scale-95"
    >
      <ShoppingBag className="h-5 w-5 text-white" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="absolute -right-1 -top-1 grid h-5 min-w-5 px-1 place-items-center rounded-full bg-glow-500 text-[10px] font-bold text-white"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
