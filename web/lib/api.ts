import { treaty } from "@elysiajs/eden";
import type { App } from "@server/index";
import type { CursorPayload } from "@shared/cursor";

export const apiClient = treaty<App>(
  process.env.NODE_ENV === "production" ? "https://erickr.dev" : "http://localhost:3000",
  { fetch: { credentials: "include" }, parseDate: false },
);

let socket: ReturnType<typeof apiClient.live.subscribe> | null = null;
const listeners = new Set<(payload: CursorPayload) => void>();
let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

function connectSocket() {
  if (socket) return socket;

  const ws = apiClient.live.subscribe();

  ws.subscribe((event) => {
    for (const listener of listeners) {
      listener(event.data as CursorPayload);
    }
  });

  ws.on("close", () => {
    socket = null;
    if (listeners.size > 0) {
      reconnectTimeout = setTimeout(connectSocket, 1000);
    }
  });

  ws.on("error", (error) => {
    console.error(error);
  });

  socket = ws;
  return ws;
}

function getSocket() {
  return socket ?? connectSocket();
}

export function subscribeCursor(onPayload: (payload: CursorPayload) => void) {
  listeners.add(onPayload);
  connectSocket();

  return () => {
    listeners.delete(onPayload);

    if (listeners.size === 0) {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = undefined;
      }

      socket?.close();
      socket = null;
    }
  };
}

export function publishCursor(payload: CursorPayload) {
  const ws = getSocket();
  if (!ws || ws.ws.readyState !== WebSocket.OPEN) return;

  ws.send(payload);
}

export async function getCursorIdentity() {
  const { data, error } = await apiClient.live.id.get();
  if (error || !data) throw new Error("Failed to fetch cursor identity");

  return data;
}
