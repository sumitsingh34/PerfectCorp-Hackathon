/**
 * Mock fashion catalog used by Act 2 ShopList. Keyed by event + tone.
 * Each row is one shoppable look-component (hair product, lipstick, garment, accessory).
 */

import type { EventKey } from "@/lib/event-templates";

export type FashionItem = {
  id: string;
  brand: string;
  name: string;
  category: "hair" | "makeup" | "outfit" | "accessory";
  hero: string;
  price: number;
};

export const FASHION_LOOKS: Record<EventKey, FashionItem[]> = {
  date: [
    { id: "h-date", brand: "Wave",   name: "Texturizing Pomade",               category: "hair",      hero: "💆", price: 18 },
    { id: "m-date", brand: "Bloom",  name: "Tinted Lip Balm",                  category: "makeup",    hero: "🧴", price: 14 },
    { id: "g-date", brand: "Edna",   name: "Black Linen Shirt",                category: "outfit",    hero: "👔", price: 128 },
    { id: "a-date", brand: "Auric",  name: "Leather Strap Watch",              category: "accessory", hero: "⌚", price: 186 },
  ],
  interview: [
    { id: "h-int",  brand: "Polish", name: "Grooming Pomade",                  category: "hair",      hero: "💆", price: 22 },
    { id: "m-int",  brand: "Bloom",  name: "Beard + Skin Balm",                category: "makeup",    hero: "🧴", price: 28 },
    { id: "g-int",  brand: "Edna",   name: "Charcoal Tailored Blazer",         category: "outfit",    hero: "🧥", price: 220 },
    { id: "a-int",  brand: "Bay",    name: "Leather Briefcase",                category: "accessory", hero: "💼", price: 215 },
  ],
  wedding: [
    { id: "h-wed",  brand: "Wave",   name: "Shine + Hold Cream",               category: "hair",      hero: "💆", price: 19 },
    { id: "m-wed",  brand: "Bloom",  name: "Hydrating Face Mist",              category: "makeup",    hero: "🧴", price: 24 },
    { id: "g-wed",  brand: "Edna",   name: "Slim Fit Dress Shirt",             category: "outfit",    hero: "👔", price: 95 },
    { id: "a-wed",  brand: "Step",   name: "Brown Oxford Shoes",               category: "accessory", hero: "👞", price: 178 },
  ],
  vacation: [
    { id: "h-vac",  brand: "Wave",   name: "Sea Salt Spray",                   category: "hair",      hero: "💆", price: 16 },
    { id: "m-vac",  brand: "Bloom",  name: "SPF 50 Face Cream",                category: "makeup",    hero: "🧴", price: 22 },
    { id: "g-vac",  brand: "Edna",   name: "Linen Camp Shirt",                 category: "outfit",    hero: "👕", price: 95 },
    { id: "a-vac",  brand: "Step",   name: "Leather Sandals",                  category: "accessory", hero: "👡", price: 78 },
  ],
  casual: [
    { id: "h-cas",  brand: "Wave",   name: "Matte Texture Clay",               category: "hair",      hero: "💆", price: 14 },
    { id: "m-cas",  brand: "Bloom",  name: "Daily Moisturizer",                category: "makeup",    hero: "🧴", price: 18 },
    { id: "g-cas",  brand: "Edna",   name: "Premium Cotton Tee",               category: "outfit",    hero: "👕", price: 48 },
    { id: "a-cas",  brand: "Step",   name: "White Low Sneaker",                category: "accessory", hero: "👟", price: 95 },
  ],
};

export function totalFor(event: EventKey): number {
  return FASHION_LOOKS[event].reduce((s, i) => s + i.price, 0);
}
