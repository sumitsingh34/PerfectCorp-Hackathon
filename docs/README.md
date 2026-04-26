# Glow Forecast — Devpost write-up

> **Tagline:** One selfie. See your future skin. Style your today look. Powered by 8 Perfect Corp YouCam APIs.

## Inspiration

Most beauty AI apps stop at "here's a virtual try-on." I wanted to do something that actually shows consumers something they can't see anywhere else: their own future, and what their day could look like if they took it seriously. The Pegasus × Perfect Corp brief asked for *fashion + accessories + beauty in one* — so I built one journey that hits all three pillars without ever feeling like three apps glued together.

## What it does

Glow Forecast is a mobile-first web experience built around a single selfie.

**Act 1 — Future You** runs Perfect Corp's HD Skin Analysis, Skin Tone, Aging Generator, and Skin Simulation models in parallel and turns the results into a draggable split-screen: your face ten years from now, neglected on the left, cared-for on the right. A six-product routine targeted at your top three concerns is generated automatically.

**Act 2 — Today You** lets the user pick an upcoming moment (Date Night, Job Interview, Wedding Guest, Vacation, Casual Friday) and runs the Hairstyle Generator, Makeup Try-On, Clothes Virtual Try-On, and an Accessory Try-On — all coordinated to the skin tone measured in Act 1. Every piece is shoppable.

**Finale — Glow Card** composes both acts into a single 1080×1920 image, sized for stories and designed to spread.

## How we built it

| Layer | Tech |
|---|---|
| Frontend | Vite · React 18 · TypeScript · TailwindCSS · Framer Motion · Zustand |
| Hosting (frontend) | Cloudflare Pages |
| API proxy | Deno + Hono on Deno Deploy (holds the bearer token) |
| AI | 8× Perfect Corp YouCam V2 APIs |
| Polish | Web Speech API narration · `html-to-image` for the share card · `idb-keyval` selfie-hash cache |

The browser uploads the selfie directly to the YouCam-presigned S3 URL, so the proxy never sees the bytes — only the metadata, task creation, and poll calls. The bearer token lives in a Deno Deploy environment variable.

## Perfect Corp APIs used

1. HD Skin Analysis — clinical-grade scores across 7 concerns
2. Skin Tone Analysis — drives the makeup + outfit palette
3. Aging Generator — the "without care" side of the slider
4. Skin Simulation — the "with care" side of the slider
5. Makeup Try-On — tone-matched look
6. Hairstyle Generator — event-appropriate cut
7. Clothes Virtual Try-On — outfit for the chosen moment
8. Bag / Jewelry / Shoes Try-On — one accessory per event

## Challenges we ran into

- **Unit budget** — 1000 units doesn't go far if you re-run during dev. I added a SHA-256 selfie cache from day one, plus a Demo Mode that routes every wrapper to fixtures so live judging never burns API calls.
- **Hiding the API key** — the YouCam key is a bearer token; shipping it client-side would have been an instant disqualifier. The Deno Deploy proxy was the cleanest free option.
- **Mobile camera quirks** — iOS Safari blocks `SpeechSynthesis` until first user tap; I ship voice as opt-in on the Landing screen.

## Accomplishments I'm proud of

- A *single coherent narrative* that meaningfully chains 8 Perfect Corp APIs.
- The split-slider — drag interaction is the demo's signature shot and worth the hours I put into it.
- Zero-API-key-leak architecture on a free hosting stack.

## What I learned

- The YouCam V2 file→task→poll pattern is consistent across every feature, which made the generic `runFeature` helper carry most of the weight.
- Caching by selfie hash isn't just a budget thing — it's the only way the demo flow stays snappy on re-runs.

## What's next

- AI Headshot of "Future You with care" → use as profile-pic CTA.
- PWA + Web Push reminder ("Day 7 of your routine — snap a check-in selfie").
- Real retail integration with Perfect Corp partner brands.

## Built for

The **Pegasus Startup World Cup × Perfect Corp Hackathon**, May 2026 — winners announced live at the Computer History Museum in Mountain View.
