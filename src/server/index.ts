import { Elysia, file, sse, t } from "elysia";
import * as v from "valibot";
import { latestStats, statsHistory, STATS_SAMPLE_INTERVAL_MS, startStatsSampler } from "./stats";
import { staticPlugin } from "@elysiajs/static";
import cors from "@elysiajs/cors";

function createCursorId() {
  return crypto.randomUUID().replaceAll("-", "");
}

const cursorPayloadSchema = v.object({
  id: v.string(),
  x: v.number(),
  y: v.number(),
  color: v.optional(v.string()),
});

const cursorCookieSchema = t.Cookie({ cursorId: t.Optional(t.String()) }, { httpOnly: true });

const app = new Elysia()
  .get("/", () => file("dist/index.html"))
  .get("/content", () => file("dist/content/index.html"))
  .use(staticPlugin({ prefix: "/_astro", assets: "dist/_astro", alwaysStatic: true }))

  .use(cors({ origin: ["http://localhost:4321"], credentials: true }))
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
  .get("/live/id", ({ cookie }) => ({ cursorId: cookie.cursorId.value ?? createCursorId() }), {
    cookie: cursorCookieSchema,
  })
  .ws("/live", {
    body: cursorPayloadSchema,
    response: cursorPayloadSchema,
    cookie: cursorCookieSchema,
    upgrade({ cookie }) {
      cookie.cursorId.value ??= createCursorId();
    },
    message(ws, payload) {
      if (payload.id !== ws.data.cookie.cursorId.value) {
        return;
      }

      ws.publish("cursors", payload, true);
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
