# ErickCReis Website

Astro frontend (static build) + Bun/Elysia API server with ORPC realtime cursor updates.

## Stack

- Bun runtime and package manager
- Elysia server (`src/server/index.ts`)
- Astro static output (`dist/`)
- ORPC API (`/api/*`) with in-memory pub/sub for live cursor updates
- Docker Compose deployment for VPS

## Local Development

Install dependencies:

```bash
bun install
```

Run frontend and backend together:

```bash
bun run dev
```

Run only API/server:

```bash
bun run dev:server
```

Run only Astro dev server:

```bash
bun run dev:web
```

The Astro dev server proxies `/api` to `http://localhost:3000`.

## Production Run (without Docker)

Build static frontend:

```bash
bun run build
```

Start Elysia server:

```bash
bun run start
```

Server binds to `0.0.0.0:${PORT:-3000}` and serves:

- `/health` (healthcheck)
- `/api/*` (ORPC endpoints)
- static assets/pages from `dist/`

## VPS Deployment with Docker Compose

Build and start:

```bash
docker compose up --build -d
```

Check health:

```bash
curl http://localhost:3000/health
```

View logs:

```bash
docker compose logs -f app
```

Stop:

```bash
docker compose down
```
