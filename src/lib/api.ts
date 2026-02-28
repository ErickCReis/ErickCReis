import { treaty } from "@elysiajs/eden";
import type { App } from "@/server/index";

export type CursorPayload = {
  id: string;
  x: number;
  y: number;
  color?: string;
};

const client = treaty<App>(
  process.env.NODE_ENV === "production" ? "https://erickr.dev" : "http://localhost:3000",
);

let socket: ReturnType<typeof client.live.subscribe> | null = null;
const listeners = new Set<(payload: CursorPayload) => void>();
let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

function connectSocket() {
  if (socket) {
    return socket;
  }

  const ws = client.live.subscribe();

  ws.subscribe((event) => {
    for (const listener of listeners) {
      listener(event.data);
    }
  });

  ws.on("close", () => {
    socket = null;
    reconnectTimeout = setTimeout(() => {
      connectSocket();
    }, 1000);
  });

  ws.on("error", (error) => {
    console.error(error);
  });

  socket = ws;
  return ws;
}

function getSocket() {
  if (!socket) {
    return connectSocket();
  }

  return socket;
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
  getSocket().send(payload);
}

export async function getCursorIdentity() {
  const { data, error } = await client.live.id.get({
    fetch: { credentials: "include" },
  });
  if (error || !data) {
    throw new Error("Failed to fetch cursor identity");
  }

  return data;
}

type ServerStatsPayload = Awaited<
  ReturnType<NonNullable<Awaited<ReturnType<typeof client.stats.stream.get>>["data"]>["next"]>
>["value"]["data"];

export async function subscribeServerStats(
  onPayload: (payload: ServerStatsPayload) => void,
  signal?: AbortSignal,
) {
  const { data, error } = await client.stats.stream.get({ fetch: { signal } });
  if (error || !data) {
    throw new Error("Failed to subscribe to server stats stream");
  }

  for await (const chunk of data) {
    if (chunk.event !== "stats") {
      continue;
    }

    onPayload(chunk.data);
  }
}

export async function getServerStatsHistory() {
  const { data, error } = await client.stats.history.get();
  if (error || !data) {
    throw new Error("Failed to fetch server stats history");
  }

  return data;
}
