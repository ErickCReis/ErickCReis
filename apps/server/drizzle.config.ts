/// <reference types="@types/bun" />

import { exit } from "node:process";
import { parseArgs } from "node:util";
import { defineConfig } from "drizzle-kit";

const { positionals } = parseArgs({
  args: Bun.argv,
  strict: false,
  allowPositionals: true,
});

console.log(positionals);
exit(0);

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
  driver: "d1-http",
  dbCredentials: {
    accountId: "8a6726bcb10e1aea94c24458bbbc99a9",
    databaseId: "c6b2e7aa-2783-459f-a97e-de7c32f7e13f",
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
