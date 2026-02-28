# ErickCReis Website

Astro static site with small SolidJS islands, served by an Elysia server that also provides typed API and websocket endpoints.

## Stack

- Bun runtime and package manager
- Astro static build output (`dist/`)
- SolidJS client islands for live telemetry/cursor behavior
- Tailwind CSS v4 via `@tailwindcss/vite`
- Solid primitives (`@solid-primitives/mouse`) for pointer tracking
- Static page shells in `src/pages/*.astro`, interactive islands in `src/islands/*`
- Elysia server entrypoint in `src/server/index.ts` serving static files from `dist/`
- Elysia websocket endpoint (`/live`) + Eden Treaty client typing
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

Server serves:

- `/` and `/content` as prerendered pages
- `/stats` and `/stats/history`
- `/stats/stream` (SSE endpoint)
- `/live` (Elysia websocket endpoint)

## Docker Production

Build and run the production image:

```bash
docker compose up --build -d
```

Check health:

```bash
curl http://localhost:3000/stats
```
