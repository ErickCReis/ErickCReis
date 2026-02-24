import homepage from "./index.html";
import { app } from "./app";

type CursorPayload = {
  id: string;
  x: number;
  y: number;
};

const sockets = new Set<Bun.ServerWebSocket<unknown>>();

function isCursorPayload(payload: unknown): payload is CursorPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as Record<string, unknown>).id === "string" &&
    typeof (payload as Record<string, unknown>).x === "number" &&
    typeof (payload as Record<string, unknown>).y === "number"
  );
}

const port = Number(process.env.PORT ?? "3000");

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  development: process.env.NODE_ENV !== "production",
  routes: {
    "/": homepage,
  },
  websocket: {
    open(ws) {
      sockets.add(ws);
    },
    close(ws) {
      sockets.delete(ws);
    },
    message(_ws, message) {
      const raw = typeof message === "string" ? message : Buffer.from(message).toString("utf8");

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      if (!isCursorPayload(parsed)) {
        return;
      }

      const stringified = JSON.stringify(parsed);
      for (const socket of sockets) {
        socket.send(stringified);
      }
    },
  },
  fetch(request, server) {
    const pathname = new URL(request.url).pathname;

    if (pathname === "/api/live") {
      if (server.upgrade(request)) {
        return;
      }

      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return app.handle(request);
  },
});

console.log(`Server listening on ${server.url}`);
