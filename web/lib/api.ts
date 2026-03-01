import { treaty } from "@elysiajs/eden";
import type { App } from "@server/index";
import {
  cursorPayloadSchema,
  serverStatsHistorySchema,
  serverStatsSchema,
  type CursorPayload,
  type ServerStats,
} from "@shared/telemetry";
import * as v from "valibot";

export type { CursorPayload } from "@shared/telemetry";

const client = treaty<App>(
  process.env.NODE_ENV === "production" ? "https://erickr.dev" : "http://localhost:3000",
  {
    fetch: {
      credentials: "include",
    },
  },
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
    const parsedPayload = v.safeParse(cursorPayloadSchema, event.data);
    if (!parsedPayload.success) {
      return;
    }

    for (const listener of listeners) {
      listener(parsedPayload.output);
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
  const socket = getSocket();
  if (!socket || socket.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(payload);
}

export async function getCursorIdentity() {
  const { data, error } = await client.live.id.get();
  if (error || !data) {
    throw new Error("Failed to fetch cursor identity");
  }

  return data;
}

export async function subscribeServerStats(
  onPayload: (payload: ServerStats) => void,
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

    const parsedPayload = v.safeParse(serverStatsSchema, chunk.data);
    if (!parsedPayload.success) {
      continue;
    }

    onPayload(parsedPayload.output);
  }
}

export async function getServerStatsHistory(): Promise<ServerStats[]> {
  const { data, error } = await client.stats.history.get();
  if (error || !data) {
    throw new Error("Failed to fetch server stats history");
  }

  const parsedHistory = v.safeParse(serverStatsHistorySchema, data);
  if (!parsedHistory.success) {
    throw new Error("Received malformed server stats history");
  }

  return parsedHistory.output;
}
