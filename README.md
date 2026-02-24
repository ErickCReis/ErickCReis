# ErickCReis Website

Bun fullstack app with Bun routes, React frontend, Elysia/Eden websockets, Tailwind CSS, and shadcn-style UI primitives.

## Stack

- Bun runtime and package manager
- React 18 + React DOM client rendering
- `bun-plugin-tailwind` + Tailwind CSS v4 for styling
- shadcn-style component layer (`src/components/ui/*`) with `class-variance-authority`
- Elysia server (`src/server/index.ts`) running on Bun
- Bun bundler frontend entry (`src/pages/index.html`)
- Elysia websocket endpoint (`/api/live`) + Eden Treaty client
- Blog collection powered by [fuma-content](https://content.fuma-nama.dev/docs/bun) (`content/blog/*.mdx`)
- Docker Compose production build/runtime

## Local Development

Install dependencies:

```bash
bun install
```

JSX is configured for React in `bunfig.toml`.

Run frontend and backend together:

```bash
bun run dev
```

Run tests (Bun test runner with coverage enabled in `bunfig.toml`):

```bash
bun run test
```

## Production Run

Build the bundled server + frontend + executable:

```bash
bun run build
```

Start the production executable:

```bash
bun run start
```

Server binds to `0.0.0.0:${PORT:-3000}` and serves:

- `/health` (healthcheck)
- `/api/live` (Elysia websocket endpoint)
- `/api/blog` (blog metadata from MDX collection)
- frontend from Bun bundling

## Docker Production

Build and run the production image:

```bash
docker compose up --build -d
```

Check health:

```bash
curl http://localhost:3000/health
```
