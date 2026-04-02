import { Elysia, sse, status, t } from "elysia";
import cors from "@elysiajs/cors";
import { cursorPayloadSchema } from "@shared/cursor";
import {
  BLOG_POST_VISITOR_ID_PATTERN,
  blogPostQueryRequestSchema,
  blogPostViewIncrementRequestSchema,
} from "@shared/content/views";
import { createDistAssetsSubrouter } from "@server/dist-assets";
import { applySecureHeaders } from "@server/secure-headers";
import { systemStat } from "@server/stats/system";
import { serverInfoStat } from "@server/stats/server";
import { websocketStat } from "@server/stats/websocket";
import { spotifyStat } from "@server/stats/spotify";
import { githubStat } from "@server/stats/github";
import { buildStatsHistoryResponse } from "@server/stats/history";
import { serializeStatsStreamEvent } from "@shared/stats/transport";
import {
  codexStat,
  parseCodexUsageSyncPayload,
  persistCodexUsageSyncPayload,
} from "@server/stats/codex";
import { createBlogPostViewsStore, createBlogVisitorId } from "@server/content/views";

const SSE_POLL_INTERVAL_MS = 500;
const BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function createCursorId() {
  return crypto.randomUUID().replaceAll("-", "");
}

const cursorCookieSchema = t.Cookie({ cursorId: t.Optional(t.String()) }, { httpOnly: true });
const blogVisitorCookieSchema = t.Cookie(
  { blogVisitorId: t.Optional(t.RegExp(BLOG_POST_VISITOR_ID_PATTERN)) },
  {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS,
    secure: Bun.env.NODE_ENV === "production",
  },
);
const blogPostViewsStore = createBlogPostViewsStore();

const statModules = [
  { name: "system" as const, mod: systemStat },
  { name: "server" as const, mod: serverInfoStat },
  { name: "websocket" as const, mod: websocketStat },
  { name: "spotify" as const, mod: spotifyStat },
  { name: "github" as const, mod: githubStat },
  { name: "codex" as const, mod: codexStat },
];

const app = new Elysia()
  .onAfterHandle(({ set }) => {
    applySecureHeaders(set.headers);
  })
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
    return buildStatsHistoryResponse();
  })
  .get(
    "/content/views",
    ({ query, set }) => {
      set.headers["cache-control"] = "no-store";
      return blogPostViewsStore.getPostViewCounts(query.slugs);
    },
    {
      query: blogPostQueryRequestSchema,
    },
  )
  .post(
    "/content/views",
    ({ body, cookie, set }) => {
      set.headers["cache-control"] = "no-store";
      const visitorId = cookie.blogVisitorId.value ?? createBlogVisitorId();

      cookie.blogVisitorId.set({
        value: visitorId,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: BLOG_VISITOR_COOKIE_MAX_AGE_SECONDS,
        secure: Bun.env.NODE_ENV === "production",
      });

      return blogPostViewsStore.registerPostView({
        slug: body.slug,
        visitorId,
      });
    },
    {
      body: blogPostViewIncrementRequestSchema,
      cookie: blogVisitorCookieSchema,
    },
  )
  .get("/stats/stream", async function* ({ set }) {
    set.headers["cache-control"] = "no-store";

    const lastSeen = new Map<string, number>();

    websocketStat.addViewer();
    try {
      while (true) {
        for (const { name, mod } of statModules) {
          const v = mod.getVersion();
          if (v > (lastSeen.get(name) ?? 0)) {
            lastSeen.set(name, v);
            const payload = serializeStatsStreamEvent(name, mod.getLatest());
            yield sse({ event: payload.e, data: payload.d });
          }
        }
        await Bun.sleep(SSE_POLL_INTERVAL_MS);
      }
    } finally {
      websocketStat.removeViewer();
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

if (Bun.env.NODE_ENV === "production") {
  app.use(createDistAssetsSubrouter());
}

app.listen({ hostname: "0.0.0.0", port: 3000 }, ({ hostname, port }) => {
  console.log(`Server is running on: http://${hostname}:${port}`);
});

if (app.server) {
  systemStat.start();
  serverInfoStat.start();
  websocketStat.start();
  spotifyStat.start();
  githubStat.start();
  codexStat.start();
}

export type App = typeof app;
