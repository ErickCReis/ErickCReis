import type { WebSocketStat } from "@shared/stats/websocket";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const SAMPLE_INTERVAL_MS = 5_000;
const MAX_HISTORY = 720;
const HOUR_MS = 3_600_000;
const PERSIST_INTERVAL_MS = 30_000;

type PersistedData = {
  maxConcurrentUsers: number;
  hourlyHistory: { ts: number; count: number }[];
};

function getPersistPath() {
  return getDataPath("websocket-stats.json");
}

let activeViewers = 0;
let maxConcurrentUsers = 0;
let sseStartedAt = Date.now();
let history: WebSocketStat[] = [];
let version = 0;
let started = false;
let persistedDirty = false;

function getConnectedUsers(): number {
  return activeViewers;
}

function sample(): WebSocketStat {
  return {
    timestamp: Date.now(),
    connectedUsers: getConnectedUsers(),
    maxConcurrentUsers,
    connectionStartedAt: sseStartedAt,
  };
}

async function loadPersisted(): Promise<void> {
  const filePath = getPersistPath();
  const file = Bun.file(filePath);
  try {
    if (await file.exists()) {
      const data = (await file.json()) as PersistedData;
      maxConcurrentUsers = data.maxConcurrentUsers ?? 0;
      const cutoff = Date.now() - HOUR_MS;
      const restored = (data.hourlyHistory ?? []).filter((h) => h.ts >= cutoff);
      for (const h of restored) {
        history.push({
          timestamp: h.ts,
          connectedUsers: h.count,
          maxConcurrentUsers,
          connectionStartedAt: sseStartedAt,
        });
      }
    }
  } catch {
    // ignore corrupt file
  }
}

async function persistData(): Promise<void> {
  if (!persistedDirty) return;
  persistedDirty = false;

  const cutoff = Date.now() - HOUR_MS;
  const hourlyHistory = history
    .filter((h) => h.timestamp >= cutoff)
    .map((h) => ({ ts: h.timestamp, count: h.connectedUsers }));

  const data: PersistedData = { maxConcurrentUsers, hourlyHistory };
  await Bun.write(getPersistPath(), JSON.stringify(data));
}

let latest: WebSocketStat = sample();

export const websocketStat: StatModule<WebSocketStat> & {
  start: () => void;
  addViewer: () => void;
  removeViewer: () => void;
} = {
  start() {
    if (started) return;
    started = true;
    sseStartedAt = Date.now();

    void loadPersisted().then(() => {
      const tick = () => {
        latest = sample();
        history.push(latest);
        if (history.length > MAX_HISTORY) history.shift();

        if (latest.connectedUsers > maxConcurrentUsers) {
          maxConcurrentUsers = latest.connectedUsers;
          latest.maxConcurrentUsers = maxConcurrentUsers;
          persistedDirty = true;
        }

        version++;
        persistedDirty = true;
      };

      tick();
      setInterval(tick, SAMPLE_INTERVAL_MS);
      setInterval(() => void persistData(), PERSIST_INTERVAL_MS);
    });
  },

  addViewer() {
    activeViewers++;
  },

  removeViewer() {
    activeViewers = Math.max(0, activeViewers - 1);
  },

  getLatest: () => latest,
  getHistory: () => [...history],
  getVersion: () => version,
};
