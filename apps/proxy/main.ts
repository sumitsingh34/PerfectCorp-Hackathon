/**
 * Glow Forecast — YouCam API proxy.
 *
 * Holds the YOUCAM_API_KEY server-side and forwards three endpoint families
 * the frontend needs: /api/upload/:feature, /api/task/:feature,
 * /api/task/:feature/:id (poll). Mirrors the YouCam V2 shape so the client
 * doesn't have to know proxy specifics.
 *
 * Deploy on Deno Deploy. Set env vars:
 *   YOUCAM_API_KEY  — bearer token from yce.makeupar.com/api-console/en/api-keys/
 *   ALLOWED_ORIGIN  — e.g. https://glow-forecast.pages.dev (CORS lock)
 *
 * Local dev:  deno task dev
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

const YOUCAM_BASE = Deno.env.get("YOUCAM_BASE") ?? "https://yce-api-01.makeupar.com";
const API_KEY = Deno.env.get("YOUCAM_API_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

if (!API_KEY) console.warn("[proxy] YOUCAM_API_KEY is not set");

const app = new Hono();

const allowList = ALLOWED_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);

function originAllowed(origin: string): string | null {
  if (!origin) return null;
  if (allowList.includes("*")) return origin;
  if (allowList.includes(origin)) return origin;
  // Allow any cloudflared quick-tunnel hostname for dev convenience.
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".trycloudflare.com")) return origin;
  } catch { /* ignore */ }
  return null;
}

app.use(
  "/api/*",
  cors({
    origin: (origin) => originAllowed(origin) ?? "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 600,
  }),
);

app.get("/health", (c) => c.json({ ok: true, version: "0.1.0", upstream: YOUCAM_BASE }));

/** Whitelist of feature slugs we forward. Locks the proxy to known endpoints. */
const FEATURES = new Set([
  "skin-analysis",
  "skin-tone-analysis",
  "aging-generator",
  "skin-simulation",
  "makeup-vto",
  "hairstyle-generator",
  "clothes-vto",
  "bag-vto",
  "jewelry-vto",
  "shoes-vto",
]);

function ensureFeature(name: string): boolean {
  return FEATURES.has(name);
}

type Json = unknown;

async function callUpstream(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; json: Json; text: string }> {
  const upstream = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await upstream.text();
  let json: Json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { ok: upstream.ok, status: upstream.status, json, text };
}

/** YouCam V2 wraps every payload in `{ status, result: {...} }`. Unwrap it. */
function unwrap(json: Json): Record<string, unknown> {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    if (obj.result && typeof obj.result === "object" && !Array.isArray(obj.result)) {
      return obj.result as Record<string, unknown>;
    }
    return obj;
  }
  return {};
}

function headersToObject(h: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(h)) {
    for (const item of h as Array<{ name?: string; value?: string }>) {
      if (item && typeof item.name === "string" && typeof item.value === "string") out[item.name] = item.value;
    }
  } else if (h && typeof h === "object") {
    for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
  }
  return out;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function upstreamErrorResponse(label: string, up: { status: number; json: Json; text: string }): Response {
  console.error(`[proxy] ${label} upstream ${up.status}:`, up.text.slice(0, 500));
  const body =
    up.json && typeof up.json === "object"
      ? up.json
      : { error: `upstream ${up.status}`, detail: up.text.slice(0, 500) };
  return jsonResponse(body, up.status || 502);
}

app.post("/api/upload/:feature", async (c) => {
  const feature = c.req.param("feature");
  if (!ensureFeature(feature)) return c.json({ error: "unknown feature" }, 400);
  if (!API_KEY) return c.json({ error: "proxy misconfigured: missing API key" }, 500);
  const body = await c.req.text();
  const up = await callUpstream(`${YOUCAM_BASE}/s2s/v2.0/file/${feature}`, { method: "POST", body });
  if (!up.ok) return upstreamErrorResponse("upload", up);

  const inner = unwrap(up.json);
  const rawFiles = Array.isArray(inner.files) ? (inner.files as Array<Record<string, unknown>>) : [];
  const files = rawFiles.map((f) => {
    const requests = Array.isArray(f.requests) ? (f.requests as Array<Record<string, unknown>>) : [];
    const req = requests[0] ?? {};
    const upload_url = (typeof req.url === "string" ? req.url : (typeof f.upload_url === "string" ? f.upload_url : ""));
    return {
      file_id: typeof f.file_id === "string" ? f.file_id : "",
      upload_url,
      headers: headersToObject(req.headers ?? f.headers),
    };
  });
  if (files.length === 0) {
    console.error("[proxy] upload: empty files array; raw=", up.text.slice(0, 500));
    return jsonResponse({ error: "upstream returned no upload targets", upstream: inner }, 502);
  }
  return jsonResponse({ files });
});

app.post("/api/task/:feature", async (c) => {
  const feature = c.req.param("feature");
  if (!ensureFeature(feature)) return c.json({ error: "unknown feature" }, 400);
  if (!API_KEY) return c.json({ error: "proxy misconfigured: missing API key" }, 500);
  const body = await c.req.text();
  const up = await callUpstream(`${YOUCAM_BASE}/s2s/v2.0/task/${feature}`, { method: "POST", body });
  if (!up.ok) return upstreamErrorResponse("task-create", up);

  const inner = unwrap(up.json);
  const task_id = typeof inner.task_id === "string" ? inner.task_id : "";
  if (!task_id) {
    console.error("[proxy] task-create: missing task_id; raw=", up.text.slice(0, 500));
    return jsonResponse({ error: "upstream returned no task_id", upstream: inner }, 502);
  }
  return jsonResponse({ task_id });
});

app.get("/api/task/:feature/:id", async (c) => {
  const feature = c.req.param("feature");
  const id = c.req.param("id");
  if (!ensureFeature(feature)) return c.json({ error: "unknown feature" }, 400);
  if (!API_KEY) return c.json({ error: "proxy misconfigured: missing API key" }, 500);
  const up = await callUpstream(
    `${YOUCAM_BASE}/s2s/v2.0/task/${feature}/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  if (!up.ok) return upstreamErrorResponse("task-poll", up);

  // Inner payload looks like { status: "running"|"success"|"error", results?, error?, progress? }
  // Lift status/error/progress to the top, and expose everything else under `result`.
  const inner = unwrap(up.json);
  const { status, error, progress, ...rest } = inner as {
    status?: string;
    error?: unknown;
    progress?: number;
    [k: string]: unknown;
  };
  return jsonResponse({
    status: status ?? "running",
    result: rest,
    error,
    progress,
  });
});

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error("[proxy] error:", err);
  return c.json({ error: err instanceof Error ? err.message : "server error" }, 500);
});

const port = Number(Deno.env.get("PORT") ?? "8000");
Deno.serve({ port }, app.fetch);
console.log(`[proxy] listening on http://localhost:${port}`);
