import { get, set, del, keys } from "idb-keyval";

const NS = "glow-cache:";

export async function getCached<T>(key: string): Promise<T | undefined> {
  return get<T>(NS + key);
}

export function putCached<T>(key: string, value: T): Promise<void> {
  return set(NS + key, value);
}

export async function clearCache(): Promise<void> {
  const all = await keys();
  await Promise.all(
    all.filter((k) => typeof k === "string" && k.startsWith(NS)).map((k) => del(k)),
  );
}

/** SHA-256 hex of an ArrayBuffer using SubtleCrypto. */
export async function sha256(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
