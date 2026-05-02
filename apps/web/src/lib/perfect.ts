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
import { fetchZip, findJson, imageUrlsByName, type ZipEntry } from "./zip";

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

function looksEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.concerns) && o.concerns.length === 0) return true;
    if (typeof o.improvedUrl === "string" && !o.improvedUrl) return true;
    if (typeof o.previewUrl === "string" && !o.previewUrl) return true;
  }
  return false;
}

async function withCache<T>(key: string, run: () => Promise<T>): Promise<T> {
  const { demoMode } = useSession.getState();
  if (demoMode) return demoFixture(key) as T;
  const hit = await getCached<T>(key);
  if (hit && !looksEmpty(hit)) return hit;
  const fresh = await run();
  if (!looksEmpty(fresh)) await putCached(key, fresh);
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

type SkinAnalysisRow = {
  action?: string;
  concern?: string;
  ui_score?: number;
  score?: number;
  mask_url?: string;
  image_url?: string;
  mask?: string;
};

/**
 * Per YouCam V2 docs, score_info.json inside the skin-analysis ZIP looks like:
 *   {
 *     "hd_redness":     { "raw_score": ..., "ui_score": 77, "output_mask_name": "hd_redness_output.png" },
 *     "hd_pore":        { "all": { "ui_score": ..., "output_mask_name": "..." }, "forehead": {...}, ... },
 *     "hd_wrinkle":     { "all": { ... }, "forehead": {...}, "crowfeet": {...}, ... },
 *     "all":            { "score": 75.75 },
 *     "skin_age":       37
 *   }
 *
 * Some concerns are flat, others are subdivided by anatomical region with an
 * aggregate `all` (or `whole`) sub-key. We unify both.
 */
function pickActionRows(raw: unknown): SkinAnalysisRow[] {
  const ACTION_KEY = /^hd_(wrinkle|pore|age_spot|redness|radiance|texture|dark_circle)/i;
  const SUB_AGG_KEYS = ["all", "whole", "overall", "total"];

  const scoreFrom = (v: Record<string, unknown>): number | undefined => {
    if (typeof v.ui_score === "number") return v.ui_score;
    if (typeof v.score === "number") return v.score;
    if (typeof v.raw_score === "number") return Math.round(v.raw_score);
    return undefined;
  };
  const maskFrom = (v: Record<string, unknown>): string | undefined => {
    for (const k of ["output_mask_name", "mask_url", "mask", "mask_image", "image", "image_url"]) {
      const s = v[k];
      if (typeof s === "string" && s) return s;
    }
    return undefined;
  };

  const fromActionEntry = (key: string, val: unknown): SkinAnalysisRow | null => {
    if (typeof val === "number") return { action: key, ui_score: val };
    if (!val || typeof val !== "object" || Array.isArray(val)) return null;
    const v = val as Record<string, unknown>;
    // Flat shape: ui_score / output_mask_name on this object.
    let score = scoreFrom(v);
    let mask = maskFrom(v);
    if (score !== undefined) return { action: key, ui_score: score, mask_url: mask };
    // Subdivided shape: prefer the aggregate sub-key, else average present sub-scores.
    for (const aggKey of SUB_AGG_KEYS) {
      const sub = v[aggKey];
      if (sub && typeof sub === "object") {
        const subObj = sub as Record<string, unknown>;
        const s = scoreFrom(subObj);
        if (s !== undefined) {
          score = s;
          mask = maskFrom(subObj) ?? mask;
          break;
        }
      }
    }
    if (score === undefined) {
      const subs: number[] = [];
      let firstMask: string | undefined;
      for (const sub of Object.values(v)) {
        if (sub && typeof sub === "object" && !Array.isArray(sub)) {
          const s = scoreFrom(sub as Record<string, unknown>);
          if (s !== undefined) {
            subs.push(s);
            firstMask ??= maskFrom(sub as Record<string, unknown>);
          }
        }
      }
      if (subs.length) {
        score = Math.round(subs.reduce((a, b) => a + b, 0) / subs.length);
        mask = mask ?? firstMask;
      }
    }
    if (score === undefined) return null;
    return { action: key, ui_score: score, mask_url: mask };
  };

  const fromActionKeyedObject = (obj: Record<string, unknown>): SkinAnalysisRow[] => {
    const rows: SkinAnalysisRow[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (!ACTION_KEY.test(key)) continue;
      const row = fromActionEntry(key, val);
      if (row) rows.push(row);
    }
    return rows;
  };

  const looksLikeRow = (v: unknown): v is SkinAnalysisRow =>
    !!v && typeof v === "object" && (
      typeof (v as Record<string, unknown>).action === "string" ||
      typeof (v as Record<string, unknown>).concern === "string"
    );

  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    if (Array.isArray(cur)) {
      const arrRows = cur.filter(looksLikeRow) as SkinAnalysisRow[];
      if (arrRows.length) return arrRows;
      for (const v of cur) stack.push(v);
      continue;
    }
    const obj = cur as Record<string, unknown>;
    const rows = fromActionKeyedObject(obj);
    if (rows.length) return rows;
    for (const v of Object.values(obj)) stack.push(v);
  }
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
    console.log("[skin-analysis] raw response", raw);
    // YouCam V2 returns the per-action results inside a presigned ZIP, e.g.
    //   { results: { url: "https://...zip?X-Amz-..." } }
    // Fetch + extract on the client; the ZIP holds a JSON manifest plus mask PNGs.
    const zipUrl = findZipUrl(raw);
    let rows = pickActionRows(raw);
    let zipEntries: ZipEntry[] = [];
    let zipJson: unknown = null;
    if (rows.length === 0 && zipUrl) {
      try {
        zipEntries = await fetchZip(zipUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`skin-analysis ZIP fetch failed (${msg}). URL: ${zipUrl.slice(0, 200)}`);
      }
      zipJson = findJson(zipEntries);
      console.log("[skin-analysis] zip JSON", zipJson, "files:", zipEntries.map((e) => e.name));
      rows = pickActionRows(zipJson);
    }
    if (rows.length === 0) {
      const fileList = zipEntries.length ? ` | files: ${zipEntries.map((e) => e.name).join(", ")}` : "";
      const innerPreview = zipJson ? ` | score JSON: ${JSON.stringify(zipJson).slice(0, 600)}` : "";
      const preview = JSON.stringify(raw).slice(0, 200);
      throw new Error(`skin-analysis: no rows. raw: ${preview}${fileList}${innerPreview}`);
    }
    const masks = imageUrlsByName(zipEntries);
    const concerns = rows
      .map((r) => {
        const rawKey = (r.action ?? r.concern ?? "").replace(/^hd_/, "");
        const maskRef = r.mask_url ?? r.image_url ?? r.mask;
        const maskUrl = typeof maskRef === "string" ? (masks[maskRef] ?? maskRef) : undefined;
        return {
          key: rawKey as ConcernKey,
          label: CONCERN_LABELS[rawKey as ConcernKey] ?? rawKey,
          score: r.ui_score ?? r.score ?? 50,
          maskUrl,
        };
      })
      .filter((c) => CONCERN_LABELS[c.key]);
    const top3 = [...concerns].sort((a, b) => a.score - b.score).slice(0, 3).map((c) => c.key);
    return { concerns, top3 };
  });
}

/** Walk the response and find any string field that looks like a presigned ZIP URL. */
function findZipUrl(raw: unknown): string | null {
  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  while (stack.length) {
    const cur = stack.pop();
    if (cur == null || seen.has(cur)) continue;
    if (typeof cur === "string") {
      // Heuristic: presigned URLs are HTTPS, AWS-signed; result archive ends in .zip before query.
      const m = cur.match(/^https?:\/\/[^?]+\.zip(\?|$)/i);
      if (m) return cur;
      continue;
    }
    if (typeof cur !== "object") continue;
    seen.add(cur);
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
    } else {
      for (const v of Object.values(cur as Record<string, unknown>)) stack.push(v);
    }
  }
  return null;
}

/**
 * Walk the response tree to find the first object that contains any of the
 * `markerKeys`. This lets us tolerate `{results: {...}}`, `{result: {...}}`,
 * `{results: [{...}]}`, `{output: [{...}]}`, or the payload sitting at top level.
 */
function pickFeaturePayload(raw: unknown, markerKeys: string[]): Record<string, unknown> {
  const hasMarker = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v) &&
    markerKeys.some((k) => k in (v as Record<string, unknown>));

  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    if (hasMarker(cur)) return cur;
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
    } else {
      for (const v of Object.values(cur as Record<string, unknown>)) stack.push(v);
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
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
    console.log("[skin-tone] raw response", raw);
    const p = pickFeaturePayload(raw, ["skin_color", "skin_hex", "undertone", "skin_undertone", "lip_color"]);
    const skinHex = strField(p, "skin_color", "skin_hex");
    const lipHex = strField(p, "lip_color", "lip_hex");
    const eyeHex = strField(p, "eye_color", "eye_hex");
    const hairHex = strField(p, "hair_color", "hair_hex");
    if (!skinHex && !lipHex && !eyeHex && !hairHex) {
      const preview = JSON.stringify(raw).slice(0, 600);
      throw new Error(`skin-tone returned no color fields. Shape: ${preview}`);
    }
    const undertoneRaw = (strField(p, "undertone", "skin_undertone") || "neutral").toLowerCase();
    const undertone: SkinToneResult["undertone"] =
      undertoneRaw.startsWith("c") ? "cool" : undertoneRaw.startsWith("w") ? "warm" : "neutral";
    return {
      undertone,
      skinHex: skinHex || "#d9b59a",
      lipHex: lipHex || "#c46a6a",
      eyeHex: eyeHex || "#5b3a29",
      hairHex: hairHex || "#2a1a14",
    };
  });
}

/**
 * Per docs, aging-generator returns:
 *   { results: [{ id, data: [{ url, dst_id, res_age }] }] }
 * with multiple `data` items per requested age. We collect every `url` we can
 * find paired with an age field — `res_age`, `age`, or any sibling that names one.
 */
function collectAgingPairs(raw: unknown): Map<number, string> {
  const out = new Map<number, string>();
  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
      continue;
    }
    const o = cur as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url : (typeof o.image_url === "string" ? o.image_url : undefined);
    const age =
      typeof o.res_age === "number" ? o.res_age :
      typeof o.age === "number" ? o.age :
      undefined;
    if (url && typeof age === "number") out.set(age, url);
    for (const v of Object.values(o)) stack.push(v);
  }
  return out;
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
    console.log("[aging] raw response", raw);
    const byAge = collectAgingPairs(raw);
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
    const p = pickFeaturePayload(raw, ["image_url", "result_url", "url"]);
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
    const p = pickFeaturePayload(raw, ["image_url", "result_url", "url", "look_name"]);
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
    const p = pickFeaturePayload(raw, ["image_url", "result_url", "url", "style_name"]);
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
    const p = pickFeaturePayload(raw, ["image_url", "result_url", "url", "garment_name"]);
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
    const p = pickFeaturePayload(raw, ["image_url", "result_url", "url", "item_name"]);
    return {
      previewUrl: strField(p, "image_url", "result_url", "url") || "",
      itemName: strField(p, "item_name") || itemId,
      category,
    };
  });
}
