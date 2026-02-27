import { Elysia, file, sse } from "elysia";
import * as v from "valibot";
import { latestStats, statsHistory, STATS_SAMPLE_INTERVAL_MS, startStatsSampler } from "./stats";
import { staticPlugin } from "@elysiajs/static";
import cors from "@elysiajs/cors";

const cursorPayloadSchema = v.object({
  id: v.string(),
  x: v.number(),
  y: v.number(),
  color: v.optional(v.string()),
});
type CursorPayload = v.InferOutput<typeof cursorPayloadSchema>;

const app = new Elysia()
  .get("/", () => file("dist/index.html"))
  .get("/content", () => file("dist/content/index.html"))
  .use(staticPlugin({ prefix: "/_astro", assets: "dist/_astro", alwaysStatic: true }))

  .use(cors({ origin: ["http://localhost:4321"] }))
  .get("/stats", () => latestStats)
  .get("/stats/history", ({ set }) => {
    set.headers["cache-control"] = "no-store";
    return statsHistory;
  })
  .get("/stats/stream", async function* ({ set }) {
    set.headers["cache-control"] = "no-store";

    while (true) {
      yield sse({ event: "stats", data: latestStats });
      await Bun.sleep(STATS_SAMPLE_INTERVAL_MS);
    }
  })
  .ws("/live", {
    body: cursorPayloadSchema,
    response: cursorPayloadSchema,
    open(ws) {
      ws.subscribe("cursors");
    },
    message(ws, payload: CursorPayload) {
      ws.publish("cursors", payload);
    },
    close(ws) {
      ws.unsubscribe("cursors");
    },
  });

app.listen(3000, ({ hostname, port }) => {
  console.log(`Server is running on: http://${hostname}:${port}`);
});

if (app.server) {
  startStatsSampler(app.server);
}

export type App = typeof app;
