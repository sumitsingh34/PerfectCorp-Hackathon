# Glow Forecast 🪞

> One selfie. See your future skin. Style your today look. Powered by Perfect Corp's YouCam AI.

**Pegasus Startup World Cup × Perfect Corp Hackathon entry - May 2026.**

## What it does

Two acts in one journey:

1. **Future You** - HD Skin Analysis + Aging Generator + Skin Simulation produce a draggable split-screen of your face 5/10 years from now: neglected on one side, cared-for on the other. Followed by a personalized routine.
2. **Today You** - Pick an upcoming moment (Date Night, Job Interview, Wedding Guest, Vacation, Casual Friday). Your skin tone drives a coordinated head-to-toe look: hairstyle + makeup + outfit + accessories - all shoppable.

A single shareable "Glow Card" combines both acts.

## Perfect Corp APIs used (8)

| Act | API |
|---|---|
| 1 | HD Skin Analysis |
| 1 | Skin Tone Analysis |
| 1 | Aging Generator |
| 1 | Skin Simulation |
| 2 | Makeup Try-On |
| 2 | Hairstyle Generator |
| 2 | Clothes Virtual Try-On |
| 2 | Bag / Jewelry / Shoes Try-On |

## Architecture

```
[Phone browser]
    │  selfie capture
    ▼
[Cloudflare Pages: Vite + React + TS app]
    │  fetch('/api/*')
    ▼
[Deno Deploy: Hono proxy + YOUCAM_API_KEY]
    │  Bearer auth
    ▼
[YouCam API]
```

The proxy keeps the API key server-side. Selfie uploads go directly browser → S3 via presigned URL.

## Repo layout

```
apps/
├── web/        # Vite + React + TS + Tailwind frontend (Cloudflare Pages)
└── proxy/      # Deno + Hono API proxy (Deno Deploy)
docs/           # Architecture, demo script, screenshots
```

## Local dev

```bash
pnpm install
pnpm dev               # frontend on http://localhost:5173
pnpm proxy:dev         # proxy on http://localhost:8000 (requires Deno)
```

Set `apps/web/.env.local` with `VITE_API_BASE=http://localhost:8000` and `apps/proxy/.env` with `YOUCAM_API_KEY=...`.

## Deploy

See [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Tech

Vite · React 18 · TypeScript · TailwindCSS · Framer Motion · Zustand · idb-keyval · html-to-image · Hono · Deno · Cloudflare Pages
