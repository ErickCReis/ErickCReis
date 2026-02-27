# ErickCReis Website

Astro static site with SolidJS islands, served by an Elysia server that also provides typed API and websocket endpoints.

## Stack

- Bun runtime and package manager
- Astro static build output (`dist/`)
- SolidJS client islands
- Tailwind CSS v4 via `@tailwindcss/vite`
- shadcn-style component layer (`src/components/ui/*`) with `class-variance-authority`
- Elysia API app in `src/server/app.tsx`
- Elysia server entrypoint in `src/server/index.ts` serving static files from `dist/`
- Elysia websocket endpoint (`/api/live`) + Eden Treaty client typing
- Astro content collections (`content/blog/*.mdx`)

## Local Development

Install dependencies:

```bash
bun install
```

Run development servers (Astro + Elysia API):

```bash
bun run dev
```

Run checks:

```bash
bun run lint
```

## Production Run

Build Astro static bundle:

```bash
bun run build
```

Start production Elysia server:

```bash
bun run start
```

Server binds to `0.0.0.0:${PORT:-3000}` and serves:

- `/` and `/content` as prerendered pages
- `/health` (healthcheck)
- `/api/stats` and `/api/stats/history`
- `/api/stats/stream` (SSE endpoint)
- `/api/live` (Elysia websocket endpoint)

## Docker Production

Build and run the production image:

```bash
docker compose up --build -d
```

Check health:

```bash
curl http://localhost:3000/health
```
