import { treaty } from "@elysiajs/eden";
import type { App } from "@/server/app";

export type CursorPayload = {
  id: string;
  x: number;
  y: number;
  color?: string;
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

const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

const client = treaty<App>(baseUrl);

let socket: ReturnType<typeof client.api.live.subscribe> | null = null;
const listeners = new Set<(payload: CursorPayload) => void>();
let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonIfString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toDataRecord(value: unknown) {
  const parsed = parseJsonIfString(value);
  if (!isRecord(parsed)) {
    return null;
  }

  const nested = parseJsonIfString(parsed.data);
  if (isRecord(nested)) {
    return nested;
  }

  return parsed;
}

function toFiniteNumber(value: unknown) {
  const number =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function toCursorPayload(value: unknown): CursorPayload | null {
  const candidate = toDataRecord(value);

  if (!candidate) {
    return null;
  }

  const { color, id, x, y } = candidate;
  const nextX = toFiniteNumber(x);
  const nextY = toFiniteNumber(y);

  if (typeof id !== "string" || nextX === null || nextY === null) {
    return null;
  }

  return {
    id,
    x: nextX,
    y: nextY,
    color: typeof color === "string" ? color : undefined,
  };
}

function connectSocket() {
  if (socket) {
    return socket;
  }

  const ws = client.api.live.subscribe();

  ws.subscribe((event) => {
    const payload = toCursorPayload(event);
    if (!payload) {
      return;
    }

    for (const listener of listeners) {
      listener(payload);
    }
  });

  ws.on("close", () => {
    socket = null;
    if (listeners.size > 0) {
      reconnectTimeout = setTimeout(() => {
        connectSocket();
      }, 1000);
    }
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
  try {
    connectSocket();
  } catch (error) {
    console.error("Failed to connect cursor websocket", error);
  }

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
  try {
    getSocket().send(payload);
  } catch (error) {
    console.error("Failed to publish cursor payload", error);
  }
}

function toServerStatsPayload(value: unknown): ServerStatsPayload | null {
  const candidate = toDataRecord(value);

  if (!candidate) {
    return null;
  }

  const timestamp =
    typeof candidate.timestamp === "string"
      ? candidate.timestamp
      : candidate.timestamp instanceof Date
        ? candidate.timestamp.toISOString()
        : null;

  if (!timestamp || !Array.isArray(candidate.loadAverage) || candidate.loadAverage.length < 3) {
    return null;
  }

  const load0 = toFiniteNumber(candidate.loadAverage[0]);
  const load1 = toFiniteNumber(candidate.loadAverage[1]);
  const load2 = toFiniteNumber(candidate.loadAverage[2]);
  const uptimeSeconds = toFiniteNumber(candidate.uptimeSeconds);
  const memoryRssMb = toFiniteNumber(candidate.memoryRssMb);
  const memoryHeapUsedMb = toFiniteNumber(candidate.memoryHeapUsedMb);
  const memoryHeapTotalMb = toFiniteNumber(candidate.memoryHeapTotalMb);
  const systemMemoryTotalMb = toFiniteNumber(candidate.systemMemoryTotalMb);
  const systemMemoryFreeMb = toFiniteNumber(candidate.systemMemoryFreeMb);
  const systemMemoryUsedPercent = toFiniteNumber(candidate.systemMemoryUsedPercent);
  const cpuCount = toFiniteNumber(candidate.cpuCount);
  const cpuUsagePercent = toFiniteNumber(candidate.cpuUsagePercent);
  const pendingRequests = toFiniteNumber(candidate.pendingRequests);
  const pendingWebSockets = toFiniteNumber(candidate.pendingWebSockets);
  const cursorSubscribers = toFiniteNumber(candidate.cursorSubscribers);

  if (
    load0 === null ||
    load1 === null ||
    load2 === null ||
    uptimeSeconds === null ||
    memoryRssMb === null ||
    memoryHeapUsedMb === null ||
    memoryHeapTotalMb === null ||
    systemMemoryTotalMb === null ||
    systemMemoryFreeMb === null ||
    systemMemoryUsedPercent === null ||
    cpuCount === null ||
    cpuUsagePercent === null ||
    pendingRequests === null ||
    pendingWebSockets === null ||
    cursorSubscribers === null
  ) {
    return null;
  }

  return {
    timestamp,
    uptimeSeconds,
    memoryRssMb,
    memoryHeapUsedMb,
    memoryHeapTotalMb,
    systemMemoryTotalMb,
    systemMemoryFreeMb,
    systemMemoryUsedPercent,
    cpuCount,
    cpuUsagePercent,
    loadAverage: [load0, load1, load2],
    pendingRequests,
    pendingWebSockets,
    cursorSubscribers,
  };
}

export async function subscribeServerStats(
  onPayload: (payload: ServerStatsPayload) => void,
  signal?: AbortSignal,
) {
  const { data, error } = await client.api.stats.stream.get({ fetch: { signal } });
  if (error || !data) {
    throw new Error("Failed to subscribe to server stats stream");
  }

  for await (const chunk of data) {
    if (isRecord(chunk) && typeof chunk.event === "string" && chunk.event !== "stats") {
      continue;
    }

    const payload = toServerStatsPayload(chunk);
    if (!payload) {
      continue;
    }

    onPayload(payload);
  }
}

export async function getServerStatsHistory() {
  const { data, error } = await client.api.stats.history.get();
  if (error || !data) {
    throw new Error("Failed to fetch server stats history");
  }

  return data
    .map((sample) => toServerStatsPayload(sample))
    .filter((sample): sample is ServerStatsPayload => sample !== null);
}
