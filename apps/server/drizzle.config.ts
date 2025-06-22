/// <reference types="@types/bun" />

import { defineConfig } from "drizzle-kit";

const wranglerD1Path = "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject";

const glob = new Bun.Glob("*.sqlite");
const dbPath = glob.scanSync(wranglerD1Path).next().value;

if (!dbPath) {
  throw new Error("No database found");
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: `${wranglerD1Path}/${dbPath}`,
  },
});
