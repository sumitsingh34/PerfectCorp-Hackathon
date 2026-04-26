/**
 * Mock skincare product catalog used by the Routine page.
 * Keyed by ConcernKey so the carousel surfaces what addresses each concern.
 * Prices/brands are illustrative — Glow Forecast is a hackathon demo, not retail.
 */
import type { ConcernKey } from "@/lib/perfect";

export type Product = {
  id: string;
  brand: string;
  name: string;
  hero: string;       // emoji or short label used as visual fallback
  price: number;
  step: "AM" | "PM" | "BOTH";
  why: string;        // 1 short sentence — shown on card
};

export const SKIN_PRODUCTS: Record<ConcernKey, Product[]> = {
  wrinkle: [
    { id: "ret-01", brand: "Atlas",   name: "Retinal 0.1% Serum",      hero: "🧪", price: 48, step: "PM", why: "Retinal accelerates collagen synthesis." },
    { id: "pep-01", brand: "Halo",    name: "Peptide Firm Cream",      hero: "💧", price: 38, step: "AM", why: "Peptides smooth expression lines." },
  ],
  pore: [
    { id: "bha-01", brand: "Clarus",  name: "2% BHA Resurfacing",      hero: "✨", price: 24, step: "PM", why: "Salicylic acid clears pore congestion." },
    { id: "nia-01", brand: "Veil",    name: "Niacinamide 10%",         hero: "🌿", price: 18, step: "BOTH", why: "Refines visible pore size over time." },
  ],
  age_spot: [
    { id: "vitc-1", brand: "Lume",    name: "15% Vitamin C",           hero: "🍊", price: 36, step: "AM", why: "Brightens hyperpigmentation." },
    { id: "tran-1", brand: "Halo",    name: "Tranexamic + Alpha Arbutin", hero: "🌟", price: 42, step: "PM", why: "Targets stubborn dark spots." },
  ],
  redness: [
    { id: "cent-1", brand: "Soothe",  name: "Centella Calm Serum",     hero: "🌱", price: 28, step: "AM", why: "Centella reduces visible redness." },
    { id: "azel-1", brand: "Atlas",   name: "Azelaic 10%",             hero: "🩷", price: 32, step: "BOTH", why: "Calms inflammatory tone." },
  ],
  radiance: [
    { id: "ahab-1", brand: "Clarus",  name: "Glycolic 7% Toner",       hero: "💎", price: 22, step: "PM", why: "Sloughs dull cells for instant glow." },
    { id: "vitc-2", brand: "Lume",    name: "Vitamin C Mist",          hero: "☀️", price: 26, step: "AM", why: "Antioxidant boost throughout the day." },
  ],
  texture: [
    { id: "lha-01", brand: "Veil",    name: "LHA Smoothing Pads",      hero: "🎯", price: 30, step: "PM", why: "Refines micro-texture without irritation." },
    { id: "uri-01", brand: "Soothe",  name: "Urea 10% Cream",          hero: "🪞", price: 19, step: "BOTH", why: "Softens uneven skin surface." },
  ],
  dark_circle: [
    { id: "caf-01", brand: "Halo",    name: "Caffeine Eye Serum",      hero: "👁️", price: 34, step: "AM", why: "De-puffs and brightens the orbital area." },
    { id: "pep-02", brand: "Atlas",   name: "Peptide Eye Treatment",   hero: "🌙", price: 44, step: "PM", why: "Strengthens thin under-eye skin." },
  ],
};

export function recommendedFor(top3: ConcernKey[]): Product[] {
  // Two products per top concern, deduped by id, capped at 6.
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const k of top3) {
    for (const p of SKIN_PRODUCTS[k] ?? []) {
      if (!seen.has(p.id) && out.length < 6) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}
