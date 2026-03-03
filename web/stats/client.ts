import { treaty } from "@elysiajs/eden";
import type { App } from "@server/index";

export const statsClient = treaty<App>(
  process.env.NODE_ENV === "production" ? "https://erickr.dev" : "http://localhost:3000",
  { fetch: { credentials: "include" }, parseDate: false },
);
