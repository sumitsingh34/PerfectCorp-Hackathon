/**
 * Typed wrappers per Perfect Corp YouCam feature used by Glow Forecast.
 *
 * The exact response shapes for some features are not fully published in the
 * public docs excerpt. Wrappers normalize to a small, app-friendly shape so
 * route components don't depend on raw upstream payloads. When the playground
 * reveals the real shape, only the `parse*` adapters here need to change.
 */

import { runFeature } from "./api";
import { useSession } from "@/store/session";
import { getCached, putCached } from "./cache";
import { demoFixture } from "./demo-fixtures";

// ─── Result types ──────────────────────────────────────────────────────────

export type ConcernKey =
  | "wrinkle" | "pore" | "age_spot" | "redness" | "radiance" | "texture" | "dark_circle";

export type SkinAnalysisResult = {
  concerns: { key: ConcernKey; label: string; score: number; maskUrl?: string }[];
  /** Top three concerns by lowest ui_score (worst first). */
  top3: ConcernKey[];
};

export type SkinToneResult = {
  /** Matched undertone bucket, used to filter products. */
  undertone: "cool" | "neutral" | "warm";
  /** Hex of detected skin, lip, eye, hair colors. */
  skinHex: string;
  lipHex: string;
  eyeHex: string;
  hairHex: string;
};

export type AgingResult = {
  age5Url: string;
  age10Url: string;
};

export type SkinSimulationResult = {
  /** "Cared-for" projection — used as the right side of the slider. */
  improvedUrl: string;
};

export type MakeupResult = { previewUrl: string; lookName: string };
export type HairResult   = { previewUrl: string; styleName: string };
export type ClothesResult   = { previewUrl: string; garmentName: string };
export type AccessoryResult = { previewUrl: string; itemName: string; category: "bag" | "jewelry" | "shoes" };

// ─── Helpers ───────────────────────────────────────────────────────────────

function toBlob(selfie: NonNullable<ReturnType<typeof useSession.getState>["selfie"]>): Blob {
  const bin = atob(selfie.base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: selfie.contentType });
}

function selfieOrThrow() {
  const s = useSession.getState().selfie;
  if (!s) throw new Error("No selfie in session");
  return s;
}

async function withCache<T>(key: string, run: () => Promise<T>): Promise<T> {
  const { demoMode } = useSession.getState();
  if (demoMode) return demoFixture(key) as T;
  const hit = await getCached<T>(key);
  if (hit) return hit;
  const fresh = await run();
  await putCached(key, fresh);
  return fresh;
}

// ─── Feature wrappers ──────────────────────────────────────────────────────

const CONCERN_LABELS: Record<ConcernKey, string> = {
  wrinkle: "Fine lines & wrinkles",
  pore: "Pores",
  age_spot: "Age spots",
  redness: "Redness",
  radiance: "Radiance",
  texture: "Texture",
  dark_circle: "Dark circles",
};

const HD_ACTIONS = [
  "hd_wrinkle", "hd_pore", "hd_age_spot", "hd_redness",
  "hd_radiance", "hd_texture", "hd_dark_circle",
] as const;

export async function runSkinAnalysis(): Promise<SkinAnalysisResult> {
  const selfie = selfieOrThrow();
  const cacheKey = `skin-analysis:${selfie.hash}`;
  return withCache(cacheKey, async () => {
    const raw = await runFeature<
      { src_file_id: string; dst_actions: readonly string[] },
      { results?: { action: string; ui_score?: number; mask_url?: string }[] }
    >(
      "skin-analysis",
      toBlob(selfie),
      `selfie-${selfie.hash.slice(0, 8)}.${selfie.contentType.includes("png") ? "png" : "jpg"}`,
      (file_id) => ({ src_file_id: file_id, dst_actions: HD_ACTIONS }),
    );
    const concerns = (raw.results || [])
      .map((r) => {
        const key = r.action.replace(/^hd_/, "") as ConcernKey;
        return {
          key,
          label: CONCERN_LABELS[key] ?? key,
          score: r.ui_score ?? 50,
          maskUrl: r.mask_url,
        };
      })
      .filter((c) => CONCERN_LABELS[c.key]);
    const top3 = [...concerns].sort((a, b) => a.score - b.score).slice(0, 3).map((c) => c.key);
    return { concerns, top3 };
  });
}

export async function runSkinTone(): Promise<SkinToneResult> {
  const selfie = selfieOrThrow();
  return withCache(`skin-tone:${selfie.hash}`, async () => {
    const raw = await runFeature<
      { src_file_id: string },
      { skin_color?: string; lip_color?: string; eye_color?: string; hair_color?: string; undertone?: string }
    >(
      "skin-tone-analysis",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id }),
    );
    const undertoneRaw = (raw.undertone || "neutral").toLowerCase();
    const undertone: SkinToneResult["undertone"] =
      undertoneRaw.startsWith("c") ? "cool" : undertoneRaw.startsWith("w") ? "warm" : "neutral";
    return {
      undertone,
      skinHex: raw.skin_color || "#d9b59a",
      lipHex: raw.lip_color || "#c46a6a",
      eyeHex: raw.eye_color || "#5b3a29",
      hairHex: raw.hair_color || "#2a1a14",
    };
  });
}

export async function runAging(): Promise<AgingResult> {
  const selfie = selfieOrThrow();
  return withCache(`aging:${selfie.hash}`, async () => {
    const raw = await runFeature<
      { src_file_id: string; ages: number[] },
      { results?: { age: number; image_url: string }[] }
    >(
      "aging-generator",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, ages: [5, 10] }),
    );
    const byAge = new Map((raw.results || []).map((r) => [r.age, r.image_url]));
    return {
      age5Url: byAge.get(5) || "",
      age10Url: byAge.get(10) || "",
    };
  });
}

export async function runSkinSimulation(top3: ConcernKey[]): Promise<SkinSimulationResult> {
  const selfie = selfieOrThrow();
  const key = `skin-sim:${selfie.hash}:${top3.join(",")}`;
  return withCache(key, async () => {
    const raw = await runFeature<
      { src_file_id: string; concerns: ConcernKey[] },
      { image_url?: string }
    >(
      "skin-simulation",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, concerns: top3 }),
    );
    return { improvedUrl: raw.image_url || "" };
  });
}

export async function runMakeup(lookId: string): Promise<MakeupResult> {
  const selfie = selfieOrThrow();
  return withCache(`makeup:${selfie.hash}:${lookId}`, async () => {
    const raw = await runFeature<
      { src_file_id: string; look_id: string },
      { image_url?: string; look_name?: string }
    >(
      "makeup-vto",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, look_id: lookId }),
    );
    return { previewUrl: raw.image_url || "", lookName: raw.look_name || lookId };
  });
}

export async function runHair(templateId: string, colorHex?: string): Promise<HairResult> {
  const selfie = selfieOrThrow();
  return withCache(`hair:${selfie.hash}:${templateId}:${colorHex || ""}`, async () => {
    const raw = await runFeature<
      { src_file_id: string; template_id: string; color?: string },
      { image_url?: string; style_name?: string }
    >(
      "hairstyle-generator",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, template_id: templateId, color: colorHex }),
    );
    return { previewUrl: raw.image_url || "", styleName: raw.style_name || templateId };
  });
}

export async function runClothes(garmentId: string): Promise<ClothesResult> {
  const selfie = selfieOrThrow();
  return withCache(`clothes:${selfie.hash}:${garmentId}`, async () => {
    const raw = await runFeature<
      { src_file_id: string; garment_id: string },
      { image_url?: string; garment_name?: string }
    >(
      "clothes-vto",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, garment_id: garmentId }),
    );
    return { previewUrl: raw.image_url || "", garmentName: raw.garment_name || garmentId };
  });
}

export async function runAccessory(
  category: AccessoryResult["category"],
  itemId: string,
): Promise<AccessoryResult> {
  const selfie = selfieOrThrow();
  const feature =
    category === "bag" ? "bag-vto" : category === "jewelry" ? "jewelry-vto" : "shoes-vto";
  return withCache(`acc:${selfie.hash}:${category}:${itemId}`, async () => {
    const raw = await runFeature<
      { src_file_id: string; item_id: string },
      { image_url?: string; item_name?: string }
    >(
      feature,
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, item_id: itemId }),
    );
    return {
      previewUrl: raw.image_url || "",
      itemName: raw.item_name || itemId,
      category,
    };
  });
}
