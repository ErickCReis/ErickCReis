import { Elysia, file, sse, status, t } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import cors from "@elysiajs/cors";
import { cursorPayloadSchema } from "@shared/cursor";
import { systemStat } from "@server/stats/system";
import { serverInfoStat } from "@server/stats/server";
import { websocketStat } from "@server/stats/websocket";
import { spotifyStat } from "@server/stats/spotify";
import { githubStat } from "@server/stats/github";
import {
  codexStat,
  parseCodexUsageSyncPayload,
  persistCodexUsageSyncPayload,
} from "@server/stats/codex";

const SSE_POLL_INTERVAL_MS = 500;

function createCursorId() {
  return crypto.randomUUID().replaceAll("-", "");
}

const cursorCookieSchema = t.Cookie({ cursorId: t.Optional(t.String()) }, { httpOnly: true });

const statConsumers = [
  { name: "system" as const, consume: () => systemStat.consumeLatest() },
  { name: "server" as const, consume: () => serverInfoStat.consumeLatest() },
  { name: "websocket" as const, consume: () => websocketStat.consumeLatest() },
  { name: "spotify" as const, consume: () => spotifyStat.consumeLatest() },
  { name: "github" as const, consume: () => githubStat.consumeLatest() },
  { name: "codex" as const, consume: () => codexStat.consumeLatest() },
];

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
  .get("/stats/history", ({ set }) => {
    set.headers["cache-control"] = "no-store";
    return {
      system: systemStat.getHistory(),
      server: serverInfoStat.getHistory(),
      websocket: websocketStat.getHistory(),
      spotify: spotifyStat.getHistory(),
      github: githubStat.getHistory(),
      codex: codexStat.getHistory(),
    };
  })
  .get("/stats/stream", async function* ({ set }) {
    set.headers["cache-control"] = "no-store";

    while (true) {
      for (const { name, consume } of statConsumers) {
        const data = consume();
        if (data) yield sse({ event: name, data });
      }
      await Bun.sleep(SSE_POLL_INTERVAL_MS);
    }
  })
  .post("/internal/codex/sync", async ({ body, request }) => {
    const configuredSyncToken = Bun.env.CODEX_SYNC_TOKEN?.trim();
    if (!configuredSyncToken) {
      return status(503, { error: "Codex sync is not configured" });
    }

    const authorization = request.headers.get("authorization");
    const providedToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    if (!providedToken || providedToken !== configuredSyncToken) {
      return status(401, { error: "Unauthorized" });
    }

    const parsedPayload = parseCodexUsageSyncPayload(body);
    if (!parsedPayload.success) {
      return status(400, { error: "Invalid Codex sync payload" });
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
      if (payload.id !== ws.data.cookie.cursorId.value) return;
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
  systemStat.start();
  serverInfoStat.start();
  websocketStat.start(app.server);
  spotifyStat.start();
  githubStat.start();
  codexStat.start();
}

export type App = typeof app;
