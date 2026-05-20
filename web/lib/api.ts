import { treaty } from "@elysiajs/eden";
import { decodeServerCursorFrame, type CursorServerFrame } from "@shared/cursor";
import type { App } from "@server/index";

const API_ORIGIN =
  process.env.NODE_ENV === "production" ? "https://erickr.dev" : "http://localhost:3000";
const LIVE_WS_URL = API_ORIGIN.replace(/^http/, "ws") + "/live";

export const apiClient = treaty<App>(API_ORIGIN, {
  fetch: { credentials: "include" },
  parseDate: false,
});

let socket: WebSocket | null = null;
const listeners = new Set<(event: CursorServerFrame) => void>();
let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
const RECONNECT_DELAY_MS = 1_000;

function clearReconnectTimeout() {
  if (!reconnectTimeout) return;

  clearTimeout(reconnectTimeout);
  reconnectTimeout = undefined;
}

function scheduleReconnect() {
  if (reconnectTimeout || listeners.size === 0) {
    return;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = undefined;
    if (listeners.size === 0 || socket) return;
    connectSocket();
  }, RECONNECT_DELAY_MS);
}

function connectSocket() {
  if (socket) return socket;

  clearReconnectTimeout();

  const ws = new WebSocket(LIVE_WS_URL);
  ws.binaryType = "arraybuffer";

  ws.addEventListener("message", (event) => {
    if (!(event.data instanceof ArrayBuffer)) return;

    const cursorEvent = decodeServerCursorFrame(event.data);
    if (!cursorEvent) return;

    for (const listener of listeners) {
      listener(cursorEvent);
    }
  });

  ws.addEventListener("close", () => {
    socket = null;
    scheduleReconnect();
  });

  ws.addEventListener("error", (error) => {
    console.error("[live] Cursor socket error", error);
  });

  socket = ws;
  return ws;
}

function getSocket() {
  return socket ?? connectSocket();
}

export function subscribeCursor(onEvent: (event: CursorServerFrame) => void) {
  listeners.add(onEvent);
  connectSocket();

  return () => {
    listeners.delete(onEvent);

    if (listeners.size === 0) {
      clearReconnectTimeout();
      socket?.close();
      socket = null;
    }
  };
}

export function publishCursor(payload: Uint8Array) {
  const ws = getSocket();
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;

  const frame = new ArrayBuffer(payload.byteLength);
  new Uint8Array(frame).set(payload);
  ws.send(frame);
  return true;
}
