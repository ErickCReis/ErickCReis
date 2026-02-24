# ErickCReis Website

Bun fullstack app with Bun routes, Solid frontend, Elysia/Eden websockets, Tailwind CSS, and shadcn-style UI primitives.

## Stack

- Bun runtime and package manager
- `@dschz/bun-plugin-solid` for Solid JSX/TSX transforms
- `bun-plugin-tailwind` + Tailwind CSS v4 for styling
- shadcn-style component layer (`src/components/ui/*`) with `class-variance-authority`
- Bun fullstack server (`src/server/index.ts`) using `Bun.serve`
- Bun bundler frontend entry (`src/server/index.html`)
- Elysia websocket endpoint (`/api/live`) + Eden Treaty client
- Blog collection powered by [fuma-content](https://content.fuma-nama.dev/docs/bun) (`content/blog/*.mdx`)
- Docker Compose deployment for VPS

## Local Development

Install dependencies:

```bash
bun install
```

Runtime Solid transforms are loaded from `bunfig.toml` via `bunPreload.ts`.

Run frontend and backend together:

```bash
bun run dev
```

UI tokens and globals live in `src/server/styles.css`. The project includes a `components.json` shadcn config and Solid-compatible UI components under `src/components/ui`.

## Production Run (without Docker)

Build the bundled server + frontend:

```bash
bun run build
```

Start the production bundle:

```bash
bun run start
```

Server binds to `0.0.0.0:${PORT:-3000}` and serves:

- `/health` (healthcheck)
- `/api/live` (Elysia websocket endpoint)
- `/api/blog` (blog metadata from MDX collection)
- frontend from Bun fullstack bundling

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
