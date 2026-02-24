import type { CursorPositionDO } from "@/durable-objects/cursor-position";
import alchemy from "alchemy";
import { Astro, DurableObjectNamespace, WranglerJson } from "alchemy/cloudflare";

const app = await alchemy("erickcreis");

const cursorPosition = DurableObjectNamespace<typeof CursorPositionDO>("cursor-position", {
  className: "CursorPositionDO",
  sqlite: true, // Enable SQLite storage
});

export const worker = await Astro("website", {
  dev: "astro dev",
  build: "astro build",
  entrypoint: "src/worker.ts",
  compatibilityDate: "2026-01-20",
  compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public", "enable_request_signal"],
  bindings: {
    CURSOR_POSITION: cursorPosition,
  },
});

await WranglerJson({ worker });

console.log({
  url: worker.url,
});

await app.finalize();
