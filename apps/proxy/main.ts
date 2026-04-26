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

async function forward(
  c: Parameters<Parameters<typeof app.get>[1]>[0],
  url: string,
  init: RequestInit,
): Promise<Response> {
  if (!API_KEY) return c.json({ error: "proxy misconfigured: missing API key" }, 500);
  const upstream = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

app.post("/api/upload/:feature", async (c) => {
  const feature = c.req.param("feature");
  if (!ensureFeature(feature)) return c.json({ error: "unknown feature" }, 400);
  const body = await c.req.text();
  return forward(c, `${YOUCAM_BASE}/s2s/v2.0/file/${feature}`, { method: "POST", body });
});

app.post("/api/task/:feature", async (c) => {
  const feature = c.req.param("feature");
  if (!ensureFeature(feature)) return c.json({ error: "unknown feature" }, 400);
  const body = await c.req.text();
  return forward(c, `${YOUCAM_BASE}/s2s/v2.0/task/${feature}`, { method: "POST", body });
});

app.get("/api/task/:feature/:id", async (c) => {
  const feature = c.req.param("feature");
  const id = c.req.param("id");
  if (!ensureFeature(feature)) return c.json({ error: "unknown feature" }, 400);
  return forward(c, `${YOUCAM_BASE}/s2s/v2.0/task/${feature}/${encodeURIComponent(id)}`, {
    method: "GET",
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
