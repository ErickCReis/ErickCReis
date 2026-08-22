import { Elysia, t } from "@server/elysia";
import { websocket } from "elysia/websocket";
import { cursorPayloadSchema } from "@shared/cursor";
import { createLiveId } from "@server/lib/id";

const cursorCookieSchema = t.Cookie(
  { cursorId: t.Optional(t.String()) },
  {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: Bun.env.NODE_ENV === "production",
  },
);

export const liveRoutes = new Elysia({ name: "live-routes" })
  .use(websocket())
  .get(
    "/live/id",
    {
      cookie: cursorCookieSchema,
    },
    ({ cookie }) => {
      cookie.cursorId.value ??= createLiveId();
      return { cursorId: cookie.cursorId.value };
    },
  )
  .ws("/live", {
    body: cursorPayloadSchema,
    response: cursorPayloadSchema,
    cookie: cursorCookieSchema,
    upgrade({ cookie }) {
      cookie.cursorId.value ??= createLiveId();
    },
    open(ws) {
      ws.subscribe("cursors");
    },
    message(ws, payload) {
      if (payload.id !== ws.cookie.cursorId.value) return;
      ws.publish("cursors", payload, true);
    },
    close(ws) {
      ws.unsubscribe("cursors");
    },
  });
