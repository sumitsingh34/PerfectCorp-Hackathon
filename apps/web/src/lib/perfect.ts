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

type SkinAnalysisRow = { action: string; ui_score?: number; mask_url?: string };

/** YouCam V2 may nest the per-action rows as `results: [...]`, `results: { output: [...] }`, or `output: [...]`. */
function pickActionRows(raw: unknown): SkinAnalysisRow[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.results)) return r.results as SkinAnalysisRow[];
  if (r.results && typeof r.results === "object") {
    const inner = r.results as Record<string, unknown>;
    if (Array.isArray(inner.output)) return inner.output as SkinAnalysisRow[];
    if (Array.isArray(inner.results)) return inner.results as SkinAnalysisRow[];
  }
  if (Array.isArray(r.output)) return r.output as SkinAnalysisRow[];
  return [];
}

export async function runSkinAnalysis(): Promise<SkinAnalysisResult> {
  const selfie = selfieOrThrow();
  const cacheKey = `skin-analysis:${selfie.hash}`;
  return withCache(cacheKey, async () => {
    const raw = await runFeature<
      { src_file_id: string; dst_actions: readonly string[] },
      unknown
    >(
      "skin-analysis",
      toBlob(selfie),
      `selfie-${selfie.hash.slice(0, 8)}.${selfie.contentType.includes("png") ? "png" : "jpg"}`,
      (file_id) => ({ src_file_id: file_id, dst_actions: HD_ACTIONS }),
    );
    const rows = pickActionRows(raw);
    if (rows.length === 0) console.warn("[skin-analysis] no rows in", raw);
    const concerns = rows
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

/** Pull the first object that looks like the feature payload, regardless of nesting. */
function pickFeaturePayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  // results may be the payload, an array containing it, or an object with `output`.
  const results = r.results;
  if (Array.isArray(results) && results[0] && typeof results[0] === "object") {
    return results[0] as Record<string, unknown>;
  }
  if (results && typeof results === "object") {
    const inner = results as Record<string, unknown>;
    if (Array.isArray(inner.output) && inner.output[0] && typeof inner.output[0] === "object") {
      return inner.output[0] as Record<string, unknown>;
    }
    return inner;
  }
  if (Array.isArray(r.output) && r.output[0] && typeof r.output[0] === "object") {
    return r.output[0] as Record<string, unknown>;
  }
  return r;
}

function strField(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

export async function runSkinTone(): Promise<SkinToneResult> {
  const selfie = selfieOrThrow();
  return withCache(`skin-tone:${selfie.hash}`, async () => {
    const raw = await runFeature<{ src_file_id: string }, unknown>(
      "skin-tone-analysis",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id }),
    );
    const p = pickFeaturePayload(raw);
    const undertoneRaw = (strField(p, "undertone", "skin_undertone") || "neutral").toLowerCase();
    const undertone: SkinToneResult["undertone"] =
      undertoneRaw.startsWith("c") ? "cool" : undertoneRaw.startsWith("w") ? "warm" : "neutral";
    return {
      undertone,
      skinHex: strField(p, "skin_color", "skin_hex") || "#d9b59a",
      lipHex: strField(p, "lip_color", "lip_hex") || "#c46a6a",
      eyeHex: strField(p, "eye_color", "eye_hex") || "#5b3a29",
      hairHex: strField(p, "hair_color", "hair_hex") || "#2a1a14",
    };
  });
}

type AgingRow = { age?: number; image_url?: string };

function pickAgingRows(raw: unknown): AgingRow[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.results)) return r.results as AgingRow[];
  if (r.results && typeof r.results === "object") {
    const inner = r.results as Record<string, unknown>;
    if (Array.isArray(inner.output)) return inner.output as AgingRow[];
  }
  if (Array.isArray(r.output)) return r.output as AgingRow[];
  return [];
}

export async function runAging(): Promise<AgingResult> {
  const selfie = selfieOrThrow();
  return withCache(`aging:${selfie.hash}`, async () => {
    const raw = await runFeature<{ src_file_id: string; ages: number[] }, unknown>(
      "aging-generator",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, ages: [5, 10] }),
    );
    const rows = pickAgingRows(raw);
    const byAge = new Map<number, string>();
    for (const row of rows) {
      if (typeof row.age === "number" && typeof row.image_url === "string") byAge.set(row.age, row.image_url);
    }
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
    const raw = await runFeature<{ src_file_id: string; concerns: ConcernKey[] }, unknown>(
      "skin-simulation",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, concerns: top3 }),
    );
    const p = pickFeaturePayload(raw);
    return { improvedUrl: strField(p, "image_url", "result_url", "url") || "" };
  });
}

export async function runMakeup(lookId: string): Promise<MakeupResult> {
  const selfie = selfieOrThrow();
  return withCache(`makeup:${selfie.hash}:${lookId}`, async () => {
    const raw = await runFeature<{ src_file_id: string; look_id: string }, unknown>(
      "makeup-vto",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, look_id: lookId }),
    );
    const p = pickFeaturePayload(raw);
    return {
      previewUrl: strField(p, "image_url", "result_url", "url") || "",
      lookName: strField(p, "look_name") || lookId,
    };
  });
}

export async function runHair(templateId: string, colorHex?: string): Promise<HairResult> {
  const selfie = selfieOrThrow();
  return withCache(`hair:${selfie.hash}:${templateId}:${colorHex || ""}`, async () => {
    const raw = await runFeature<
      { src_file_id: string; template_id: string; color?: string },
      unknown
    >(
      "hairstyle-generator",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, template_id: templateId, color: colorHex }),
    );
    const p = pickFeaturePayload(raw);
    return {
      previewUrl: strField(p, "image_url", "result_url", "url") || "",
      styleName: strField(p, "style_name") || templateId,
    };
  });
}

export async function runClothes(garmentId: string): Promise<ClothesResult> {
  const selfie = selfieOrThrow();
  return withCache(`clothes:${selfie.hash}:${garmentId}`, async () => {
    const raw = await runFeature<{ src_file_id: string; garment_id: string }, unknown>(
      "clothes-vto",
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, garment_id: garmentId }),
    );
    const p = pickFeaturePayload(raw);
    return {
      previewUrl: strField(p, "image_url", "result_url", "url") || "",
      garmentName: strField(p, "garment_name") || garmentId,
    };
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
    const raw = await runFeature<{ src_file_id: string; item_id: string }, unknown>(
      feature,
      toBlob(selfie),
      `selfie.jpg`,
      (file_id) => ({ src_file_id: file_id, item_id: itemId }),
    );
    const p = pickFeaturePayload(raw);
    return {
      previewUrl: strField(p, "image_url", "result_url", "url") || "",
      itemName: strField(p, "item_name") || itemId,
      category,
    };
  });
}
