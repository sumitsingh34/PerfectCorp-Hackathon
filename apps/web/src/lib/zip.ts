import { unzipSync, strFromU8 } from "fflate";

export type ZipEntry = { name: string; data: Uint8Array };

/** Fetch a ZIP from a URL and return its files in memory. */
export async function fetchZip(url: string): Promise<ZipEntry[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`zip fetch failed: ${res.status} ${res.statusText}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const map = unzipSync(buf);
  return Object.entries(map).map(([name, data]) => ({ name, data }));
}

/** Find the first .json file inside the entries and parse it. */
export function findJson<T = unknown>(entries: ZipEntry[]): T | null {
  const json = entries.find((e) => e.name.toLowerCase().endsWith(".json"));
  if (!json) return null;
  try {
    return JSON.parse(strFromU8(json.data)) as T;
  } catch {
    return null;
  }
}

/** Build object URLs for any image entries (png/jpg/webp), keyed by basename. */
export function imageUrlsByName(entries: ZipEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of entries) {
    const lower = e.name.toLowerCase();
    let mime = "";
    if (lower.endsWith(".png")) mime = "image/png";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
    else if (lower.endsWith(".webp")) mime = "image/webp";
    if (!mime) continue;
    const blob = new Blob([e.data], { type: mime });
    out[e.name] = URL.createObjectURL(blob);
    // Also key by basename for easier lookup.
    const base = e.name.split("/").pop() ?? e.name;
    if (base && base !== e.name) out[base] = out[e.name];
  }
  return out;
}
