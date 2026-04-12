import type { WebSocketStat } from "@shared/stats/websocket";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const SAMPLE_INTERVAL_MS = 5_000;
const MAX_HISTORY = 84;
const HOUR_MS = 3_600_000;
const PERSIST_INTERVAL_MS = 30_000;
const VIEWER_STALE_AFTER_MS = 45_000;

type PersistedData = {
  maxConcurrentUsers: number;
  hourlyHistory: { ts: number; count: number }[];
};

function getPersistPath() {
  return getDataPath("presence-stats-v1.json");
}

const activeViewerTabs = new Map<string, number>();
let maxConcurrentUsers = 0;
let sseStartedAt = Date.now();
let history: WebSocketStat[] = [];
let version = 0;
let started = false;
let persistedDirty = false;

function pruneStaleViewerTabs(now = Date.now()): void {
  const cutoff = now - VIEWER_STALE_AFTER_MS;
  for (const [tabId, lastSeenAt] of activeViewerTabs) {
    if (lastSeenAt < cutoff) {
      activeViewerTabs.delete(tabId);
    }
  }
}

function getConnectedUsers(now = Date.now()): number {
  pruneStaleViewerTabs(now);
  return activeViewerTabs.size;
}

function sample(now = Date.now()): WebSocketStat {
  return {
    timestamp: now,
    connectedUsers: getConnectedUsers(now),
    maxConcurrentUsers,
    connectionStartedAt: sseStartedAt,
  };
}

function syncPresenceSnapshot(now: number, previousCount: number): void {
  const connectedUsers = activeViewerTabs.size;
  let changed = connectedUsers !== previousCount;

  if (connectedUsers > maxConcurrentUsers) {
    maxConcurrentUsers = connectedUsers;
    persistedDirty = true;
    changed = true;
  }

  if (!changed) {
    return;
  }

  latest = {
    timestamp: now,
    connectedUsers,
    maxConcurrentUsers,
    connectionStartedAt: sseStartedAt,
  };
  version++;
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
  touchViewerTab: (tabId: string, now?: number) => void;
  removeViewerTab: (tabId: string, now?: number) => void;
} = {
  start() {
    if (started) return;
    started = true;
    sseStartedAt = Date.now();

    void loadPersisted().then(() => {
      const tick = () => {
        const now = Date.now();
        latest = sample(now);
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

  touchViewerTab(tabId, now = Date.now()) {
    const previousCount = activeViewerTabs.size;
    pruneStaleViewerTabs(now);
    activeViewerTabs.set(tabId, now);
    syncPresenceSnapshot(now, previousCount);
  },

  removeViewerTab(tabId, now = Date.now()) {
    const previousCount = activeViewerTabs.size;
    pruneStaleViewerTabs(now);
    activeViewerTabs.delete(tabId);
    syncPresenceSnapshot(now, previousCount);
  },

  getLatest: () => latest,
  getHistory: () => [...history],
  getVersion: () => version,
};
