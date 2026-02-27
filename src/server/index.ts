import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { Elysia } from "elysia";

import { createApp } from "./app";

const DIST_DIR = resolve(process.cwd(), "dist");
const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? "3000");

function toStaticPath(pathname: string) {
  const decoded = decodeURIComponent(pathname);
  const normalized = decoded.replace(/\\/g, "/").replace(/^\/+/, "");
  const base = normalized === "" ? "index.html" : normalized;

  const candidates = [base];
  if (base.endsWith("/")) {
    candidates.push(`${base}index.html`);
  } else if (!base.includes(".")) {
    candidates.push(`${base}/index.html`);
  }

  for (const candidate of candidates) {
    const absolutePath = resolve(join(DIST_DIR, candidate));
    if (!absolutePath.startsWith(DIST_DIR)) {
      continue;
    }

    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      continue;
    }

    return absolutePath;
  }

  return null;
}

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(createApp())
  .get("/*", ({ request, set }) => {
    const url = new URL(request.url);
    const filePath = toStaticPath(url.pathname);

    if (filePath) {
      return new Response(Bun.file(filePath));
    }

    const notFoundPath = toStaticPath("/404.html");
    if (notFoundPath) {
      set.status = 404;
      return new Response(Bun.file(notFoundPath));
    }

    set.status = 404;
    return "Not Found";
  });

app.listen({
  hostname: HOST,
  port: PORT,
});

console.log(`Elysia server running at http://${HOST}:${PORT}`);
