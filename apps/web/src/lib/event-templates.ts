/**
 * Maps each "moment" the user can pick to a coordinated Act 2 look:
 * one hairstyle template, one makeup look, one outfit garment, one accessory.
 *
 * IDs are placeholders — the YouCam playground exposes the real catalog of
 * template/garment IDs per feature; swap these in once we've confirmed the
 * working set for the demo. Each event also picks ONE accessory category
 * (bag / jewelry / shoes) that's contextually right for the moment, which
 * keeps Act 2 to a single accessory call (saves API units).
 */

export type EventKey = "date" | "interview" | "wedding" | "vacation" | "casual";

export type EventTemplate = {
  key: EventKey;
  title: string;
  blurb: string;
  emoji: string;
  /**
   * Public URL (or same-origin path under apps/web/public/hair/) of a
   * reference photo for the desired hairstyle. Perfect Corp's hair-transfer
   * uploads this image and transfers its style onto the selfie.
   */
  hairReferenceUrl: string;
  /** Display label for the style; falls back to whatever the API returns. */
  hairStyleName: string;
  /**
   * Perfect Corp's makeup-vto has no look catalog — it takes an effects array
   * with per-category hex colors. Each event ships its own effects.
   */
  makeupEffects: MakeupEffect[];
  makeupLookName: string;
  garmentId: string;
  accessory: { category: "bag" | "jewelry" | "shoes"; itemId: string };
  paletteHint: string[];
};

/**
 * One entry in makeup-vto's `effects` array. The exact shape varies by
 * `category` (lip_color, eye_shadow, blush, ...); we keep it permissive so
 * each event can supply whatever the API expects for that category.
 */
export type MakeupEffect = Record<string, unknown>;

/**
 * Helper: lip-color effect matching Perfect Corp's per-category schema.
 * lip_color requires `shape` and `style` at the effect level. For gloss
 * texture the palette additionally takes a `gloss` value.
 */
const lip = (
  hex: string,
  texture: "matte" | "gloss" = "matte",
  intensity = 80,
): MakeupEffect => {
  const palette: Record<string, unknown> = { color: hex, texture, colorIntensity: intensity };
  if (texture === "gloss") palette.gloss = 75;
  return {
    category: "lip_color",
    shape: { name: "natural" },
    style: { type: "full" },
    palettes: [palette],
  };
};

export const EVENTS: Record<EventKey, EventTemplate> = {
  date: {
    key: "date",
    title: "Date Night",
    blurb: "Soft glow, ember lip, an outfit that moves with the candlelight.",
    emoji: "🌹",
    hairReferenceUrl: "/hair/loose_waves.jpg",
    hairStyleName: "Loose Waves",
    makeupLookName: "Ember Glow",
    makeupEffects: [lip("#7a1a2b", "gloss", 85)],
    garmentId: "slip_dress_burgundy",
    accessory: { category: "jewelry", itemId: "gold_hoops_md" },
    paletteHint: ["#7a1a2b", "#c46a6a", "#f7d6c1"],
  },
  interview: {
    key: "interview",
    title: "Job Interview",
    blurb: "Sharpened polish. A look that says 'I've already started.'",
    emoji: "💼",
    hairReferenceUrl: "/hair/low_pony.jpg",
    hairStyleName: "Low Pony",
    makeupLookName: "Clean Neutral",
    makeupEffects: [lip("#a85f4a", "matte", 60)],
    garmentId: "tailored_blazer_charcoal",
    accessory: { category: "bag", itemId: "structured_tote_black" },
    paletteHint: ["#1a1a1f", "#5e6770", "#e7e3dc"],
  },
  wedding: {
    key: "wedding",
    title: "Wedding Guest",
    blurb: "Soft romance, complimentary not competitive.",
    emoji: "💐",
    hairReferenceUrl: "/hair/soft_updo.jpg",
    hairStyleName: "Soft Updo",
    makeupLookName: "Rose Petal",
    makeupEffects: [lip("#cf6a78", "gloss", 75)],
    garmentId: "midi_dress_dustyrose",
    accessory: { category: "shoes", itemId: "block_heel_nude" },
    paletteHint: ["#cf8a8a", "#e6b8a2", "#f5e6da"],
  },
  vacation: {
    key: "vacation",
    title: "Vacation",
    blurb: "Sun-kissed, breezy, ready to be photographed by accident.",
    emoji: "🌴",
    hairReferenceUrl: "/hair/beachy_waves.jpg",
    hairStyleName: "Beachy Waves",
    makeupLookName: "Sunlit Bronze",
    makeupEffects: [lip("#c89456", "gloss", 70)],
    garmentId: "linen_set_white",
    accessory: { category: "bag", itemId: "straw_crossbody" },
    paletteHint: ["#f4d6a8", "#c89456", "#1f6b6f"],
  },
  casual: {
    key: "casual",
    title: "Casual Friday",
    blurb: "Effortless, but not accidentally - confident neutrals with a wink.",
    emoji: "☕",
    hairReferenceUrl: "/hair/messy_bun.jpg",
    hairStyleName: "Messy Bun",
    makeupLookName: "Your Skin But Better",
    makeupEffects: [lip("#b08070", "matte", 50)],
    garmentId: "denim_oversize_set",
    accessory: { category: "shoes", itemId: "sneaker_white_low" },
    paletteHint: ["#7a5a3a", "#d8c5b0", "#1c1c1c"],
  },
};

export const EVENT_LIST: EventTemplate[] = (Object.values(EVENTS) as EventTemplate[]);
