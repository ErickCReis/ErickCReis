/// <reference types="@types/bun" />

import { parseArgs } from "node:util";
import alchemy from "alchemy";
import {
  D1Database,
  DurableObjectNamespace,
  Worker,
  WranglerJson,
} from "alchemy/cloudflare";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    stage: { type: "string" },
  },
  strict: false,
});

if (values.stage !== "production" && values.stage !== "dev") {
  throw new Error("Invalid stage");
}

const app = await alchemy("erickcreis");

const cursorPosition = new DurableObjectNamespace(
  "erickcreis-cursor-position",
  {
    className: "CursorPosition",
    sqlite: true,
  },
);

export const db = await D1Database("erickcreis-db");

export const worker = await Worker("erickcreis", {
  entrypoint: "./src/index.ts",
  bindings: {
    DB: db,
    CURSOR_POSITION: cursorPosition,
    BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET).name,
    BETTER_AUTH_URL:
      values.stage === "production"
        ? "https://erickcreis.erickcorreareis.workers.dev"
        : "http://localhost:3000",
    CORS_ORIGIN:
      values.stage === "production"
        ? "https://erickcreis.github.io"
        : "http://localhost:4321",
  },
});

if (values.stage === "dev") {
  await WranglerJson("wrangler.jsonc", { worker });
}

console.log({ url: worker.url });

await app.finalize();
