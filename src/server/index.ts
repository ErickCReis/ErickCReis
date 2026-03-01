import { Elysia, file, sse, t } from "elysia";
import * as v from "valibot";
import { parseCodexUsageSyncPayload, persistCodexUsageSyncPayload } from "./codex-usage";
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

  .use(
    cors({
      origin:
        Bun.env.NODE_ENV === "production"
          ? ["https://erickr.dev", "https://www.erickr.dev"]
          : ["http://localhost:4321"],
      credentials: true,
    }),
  )
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
  .post("/internal/codex/sync", async ({ body, request, set }) => {
    const configuredSyncToken = Bun.env.CODEX_SYNC_TOKEN?.trim();
    if (!configuredSyncToken) {
      set.status = 503;
      return {
        error: "Codex sync is not configured",
      };
    }

    const authorization = request.headers.get("authorization");
    const providedToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    if (!providedToken || providedToken !== configuredSyncToken) {
      set.status = 401;
      return {
        error: "Unauthorized",
      };
    }

    const parsedPayload = parseCodexUsageSyncPayload(body);
    if (!parsedPayload.success) {
      set.status = 400;
      return {
        error: "Invalid Codex sync payload",
      };
    }

    await persistCodexUsageSyncPayload(parsedPayload.output);

    return {
      ok: true,
      generatedAt: parsedPayload.output.generatedAt,
      daysSynced: parsedPayload.output.daily.length,
    };
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
    open(ws) {
      ws.subscribe("cursors");
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

app.listen({ hostname: "0.0.0.0", port: 3000 }, ({ hostname, port }) => {
  console.log(`Server is running on: http://${hostname}:${port}`);
});

if (app.server) {
  startStatsSampler(app.server);
}

export type App = typeof app;
