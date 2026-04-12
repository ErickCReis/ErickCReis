import { Elysia, t } from "elysia";
import { websocketStat } from "@server/stats/websocket";

const presenceQuerySchema = t.Object({
  tabId: t.String({ minLength: 1, maxLength: 128 }),
});

export const presenceRoutes = new Elysia({ name: "presence-routes" })
  .post(
    "/presence/ping",
    ({ query, set }) => {
      set.headers["cache-control"] = "no-store";
      websocketStat.touchViewerTab(query.tabId);
      return { ok: true };
    },
    {
      query: presenceQuerySchema,
    },
  )
  .post(
    "/presence/leave",
    ({ query, set }) => {
      set.headers["cache-control"] = "no-store";
      websocketStat.removeViewerTab(query.tabId);
      return { ok: true };
    },
    {
      query: presenceQuerySchema,
    },
  );
