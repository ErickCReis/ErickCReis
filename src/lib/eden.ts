import { treaty } from "@elysiajs/eden";
import type { App } from "@/server/app";

export type CursorPayload = {
  id: string;
  x: number;
  y: number;
  color?: string;
};

const baseUrl = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
const client = treaty<App>(baseUrl);
type StatsStreamEvent = {
  event?: string;
  data: ServerStatsPayload;
};

export type ServerStatsPayload = {
  timestamp: string;
  uptimeSeconds: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  memoryHeapTotalMb: number;
  systemMemoryTotalMb: number;
  systemMemoryFreeMb: number;
  systemMemoryUsedPercent: number;
  cpuCount: number;
  cpuUsagePercent: number;
  loadAverage: [number, number, number];
  pendingRequests: number;
  pendingWebSockets: number;
  cursorSubscribers: number;
};

let socket: ReturnType<typeof client.api.live.subscribe> | null = null;
const listeners = new Set<(payload: CursorPayload) => void>();
let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

function connectSocket() {
  if (socket) {
    return socket;
  }

  const ws = client.api.live.subscribe();

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

export async function subscribeServerStats(
  onPayload: (payload: ServerStatsPayload) => void,
  signal?: AbortSignal,
) {
  const options = signal
    ? {
        fetch: {
          signal,
        },
      }
    : undefined;
  const { data, error } = await client.api.stats.stream.get(options);

  if (error || !data) {
    throw new Error("Failed to subscribe to server stats stream");
  }

  for await (const chunk of data as unknown as AsyncIterable<StatsStreamEvent>) {
    if (chunk.event !== "stats") {
      continue;
    }

    onPayload(chunk.data);
  }
}

export async function getBlogPosts() {
  const { data, error } = await client.api.blog.get();

  if (error || !data) {
    throw new Error("Failed to fetch blog posts");
  }

  return data;
}

export type BlogPost = Awaited<ReturnType<typeof getBlogPosts>>[number];
