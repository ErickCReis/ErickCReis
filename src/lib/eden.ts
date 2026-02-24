import { treaty } from "@elysiajs/eden";
import type { App } from "@/server/app";

export type CursorPayload = {
  id: string;
  x: number;
  y: number;
};

const baseUrl = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
const client = treaty<App>(baseUrl);
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

export async function getBlogPosts() {
  const { data, error } = await client.api.blog.get();

  if (error || !data) {
    throw new Error("Failed to fetch blog posts");
  }

  return data;
}

export type BlogPost = Awaited<ReturnType<typeof getBlogPosts>>[number];
