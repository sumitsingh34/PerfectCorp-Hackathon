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

const COMMON_MAKEUP = (lookId: string): FashionItem => ({
  id: `lip-${lookId}`, brand: "Bloom", name: "Satin Lip — " + lookId.replace(/_/g, " "), category: "makeup", hero: "💄", price: 24,
});

export const FASHION_LOOKS: Record<EventKey, FashionItem[]> = {
  date: [
    { id: "h-date", brand: "Wave",   name: "Heat Curl Spray",                  category: "hair",      hero: "💇‍♀️", price: 18 },
    COMMON_MAKEUP("ember_glow"),
    { id: "g-date", brand: "Edna",   name: "Burgundy Slip Dress",              category: "outfit",    hero: "👗", price: 128 },
    { id: "a-date", brand: "Auric",  name: "14k Hoops",                        category: "accessory", hero: "💍", price: 86 },
  ],
  interview: [
    { id: "h-int",  brand: "Polish", name: "Smoothing Serum",                  category: "hair",      hero: "💇‍♀️", price: 22 },
    COMMON_MAKEUP("clean_neutral"),
    { id: "g-int",  brand: "Edna",   name: "Charcoal Tailored Blazer",         category: "outfit",    hero: "🧥", price: 220 },
    { id: "a-int",  brand: "Bay",    name: "Structured Leather Tote",          category: "accessory", hero: "👜", price: 165 },
  ],
  wedding: [
    { id: "h-wed",  brand: "Wave",   name: "Hold + Shine Spray",               category: "hair",      hero: "💇‍♀️", price: 19 },
    COMMON_MAKEUP("rose_petal"),
    { id: "g-wed",  brand: "Edna",   name: "Dusty Rose Midi",                  category: "outfit",    hero: "👗", price: 178 },
    { id: "a-wed",  brand: "Step",   name: "Nude Block Heel",                  category: "accessory", hero: "👠", price: 142 },
  ],
  vacation: [
    { id: "h-vac",  brand: "Wave",   name: "Sea Salt Spray",                   category: "hair",      hero: "💇‍♀️", price: 16 },
    COMMON_MAKEUP("sunlit_bronze"),
    { id: "g-vac",  brand: "Edna",   name: "White Linen Set",                  category: "outfit",    hero: "👚", price: 158 },
    { id: "a-vac",  brand: "Bay",    name: "Straw Crossbody",                  category: "accessory", hero: "👜", price: 78 },
  ],
  casual: [
    { id: "h-cas",  brand: "Wave",   name: "Texture Cream",                    category: "hair",      hero: "💇‍♀️", price: 14 },
    COMMON_MAKEUP("your_skin_better"),
    { id: "g-cas",  brand: "Edna",   name: "Oversize Denim Set",               category: "outfit",    hero: "👖", price: 124 },
    { id: "a-cas",  brand: "Step",   name: "White Low Sneaker",                category: "accessory", hero: "👟", price: 95 },
  ],
};

export function totalFor(event: EventKey): number {
  return FASHION_LOOKS[event].reduce((s, i) => s + i.price, 0);
}
