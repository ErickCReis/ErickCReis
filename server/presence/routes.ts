import { Elysia, t } from "@server/elysia";
import { websocketStat } from "@server/stats/websocket";

const presenceQuerySchema = t.Object({
  tabId: t.String({ minLength: 1, maxLength: 128 }),
});

export const presenceRoutes = new Elysia({ name: "presence-routes" })
  .post(
    "/presence/ping",
    {
      query: presenceQuerySchema,
    },
    ({ query, set }) => {
      set.headers["cache-control"] = "no-store";
      websocketStat.touchViewerTab(query.tabId);
      return { ok: true };
    },
  )
  .post(
    "/presence/leave",
    {
      query: presenceQuerySchema,
    },
    ({ query, set }) => {
      set.headers["cache-control"] = "no-store";
      websocketStat.removeViewerTab(query.tabId);
      return { ok: true };
    },
  );
