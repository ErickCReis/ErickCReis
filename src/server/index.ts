import { Elysia } from "elysia";
import { RPCHandler } from "@orpc/server/fetch";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { router } from "../api/router";

const app = new Elysia();
const rpcHandler = new RPCHandler(router);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../../dist");

function toSafePathname(rawPathname: string) {
  const decoded = decodeURIComponent(rawPathname);
  const normalized = path.posix.normalize(decoded);

  if (normalized.includes("\0")) {
    return null;
  }

  if (normalized.startsWith("../") || normalized === "..") {
    return null;
  }

  return normalized === "/" ? "/index.html" : normalized;
}

async function resolveStaticFile(pathname: string) {
  const withSlashStripped = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const absolute = path.join(distDir, withSlashStripped);

  const htmlCandidate = `${absolute}.html`;
  const indexCandidate = path.join(absolute, "index.html");

  const candidates = [absolute];
  if (!path.extname(absolute)) {
    candidates.push(htmlCandidate, indexCandidate);
  }

  for (const candidate of candidates) {
    const file = Bun.file(candidate);
    if (await file.exists()) {
      return file;
    }
  }

  return null;
}

async function serveStaticAsset(request: Request) {
  const url = new URL(request.url);
  const safePathname = toSafePathname(url.pathname);

  if (!safePathname) {
    return new Response("Bad Request", { status: 400 });
  }

  const file = await resolveStaticFile(safePathname);

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  if (file.type) {
    return new Response(file, {
      headers: {
        "Content-Type": file.type,
      },
    });
  }

  return new Response(file);
}

app.get("/health", () => "ok");

app.all("/api/*", async ({ request }) => {
  const { response } = await rpcHandler.handle(request, { prefix: "/api" });
  return response ?? new Response("Not found", { status: 404 });
});

app.all("/api", async ({ request }) => {
  const { response } = await rpcHandler.handle(request, { prefix: "/api" });
  return response ?? new Response("Not found", { status: 404 });
});

app.get("/", ({ request }) => serveStaticAsset(request));

app.get("/*", ({ request }) => serveStaticAsset(request));

const port = Number(process.env.PORT ?? "3000");

app.listen({
  hostname: "0.0.0.0",
  port,
});

console.log(`Server listening on http://0.0.0.0:${port}`);
