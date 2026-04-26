# Glow Forecast — Proxy

Tiny Deno + Hono proxy that holds the YouCam API key and forwards file/task/poll
calls. Locked to a known set of feature slugs and the configured CORS origin.

## Local dev

```bash
cd apps/proxy
cp .env.example .env
# edit .env to add your YOUCAM_API_KEY
deno task dev
```

The proxy listens on `http://localhost:8000` by default.

## Deploy to Deno Deploy

1. Push the repo to GitHub.
2. Create a project on https://dash.deno.com → link the GitHub repo.
3. Set entrypoint: `apps/proxy/main.ts`.
4. Add env vars in the dashboard:
   - `YOUCAM_API_KEY` — bearer token
   - `ALLOWED_ORIGIN` — your Cloudflare Pages URL (e.g. `https://glow-forecast.pages.dev`)
5. Auto-deploys on push to `main`.

## Endpoints

- `GET  /health`
- `POST /api/upload/:feature` — body `{ files: [{ content_type, file_name, file_size }] }`
- `POST /api/task/:feature` — body is feature-specific (forwarded as-is)
- `GET  /api/task/:feature/:id` — poll status
