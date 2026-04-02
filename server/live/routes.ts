import { Elysia, t } from "elysia";
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
  .get("/live/id", ({ cookie }) => ({ cursorId: cookie.cursorId.value ?? createLiveId() }), {
    cookie: cursorCookieSchema,
  })
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
      if (payload.id !== ws.data.cookie.cursorId.value) return;
      ws.publish("cursors", payload, true);
    },
    close(ws) {
      ws.unsubscribe("cursors");
    },
  });
