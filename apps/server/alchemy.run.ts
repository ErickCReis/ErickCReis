/// <reference types="@types/bun" />

import alchemy from "alchemy";
import { D1Database, Worker, WranglerJson } from "alchemy/cloudflare";

const app = await alchemy("erickcreis");

export const db = await D1Database("erickcreis-db", {
  name: "erickcreis-db",
});

export const worker = await Worker("erickcreis-server", {
  entrypoint: "./src/index.ts",
  bindings: {
    DB: db,
    BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET).name,
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:3001",
  },
});

await WranglerJson("wrangler.jsonc", { worker });

console.log({ url: worker.url });

await app.finalize();
