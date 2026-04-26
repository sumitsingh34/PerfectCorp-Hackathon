import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  hero: string;
  category?: string;
  qty: number;
  addedAt: number;
};

type State = {
  items: CartItem[];
  drawerOpen: boolean;
  add: (i: Omit<CartItem, "addedAt" | "qty">) => void;
  addMany: (xs: Omit<CartItem, "addedAt" | "qty">[]) => number;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  clear: () => void;
  setDrawer: (open: boolean) => void;
};

export const useCart = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      add: (i) => {
        if (get().items.some((x) => x.id === i.id)) return;
        set({ items: [...get().items, { ...i, qty: 1, addedAt: Date.now() }] });
      },
      addMany: (xs) => {
        const existing = new Set(get().items.map((x) => x.id));
        const fresh = xs
          .filter((x) => !existing.has(x.id))
          .map((x) => ({ ...x, qty: 1, addedAt: Date.now() }));
        if (fresh.length) set({ items: [...get().items, ...fresh] });
        return fresh.length;
      },
      remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
      setQty: (id, qty) => {
        if (qty <= 0) { set({ items: get().items.filter((x) => x.id !== id) }); return; }
        set({ items: get().items.map((x) => (x.id === id ? { ...x, qty: Math.min(99, qty) } : x)) });
      },
      inc: (id) => get().setQty(id, (get().items.find((x) => x.id === id)?.qty ?? 0) + 1),
      dec: (id) => get().setQty(id, (get().items.find((x) => x.id === id)?.qty ?? 0) - 1),
      clear: () => set({ items: [] }),
      setDrawer: (drawerOpen) => set({ drawerOpen }),
    }),
    {
      name: "glow-forecast-cart",
      // Migrate older persisted carts that lack `qty`.
      migrate: (state: unknown) => {
        const s = state as { items?: CartItem[] } | undefined;
        if (s?.items) s.items = s.items.map((it) => ({ ...it, qty: it.qty ?? 1 }));
        return s as State;
      },
      version: 2,
    },
  ),
);

export const cartTotal = (items: CartItem[]) =>
  items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);
export const cartCount = (items: CartItem[]) =>
  items.reduce((s, i) => s + (i.qty ?? 1), 0);
