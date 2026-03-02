import type { WebSocketStat } from "@shared/stats/websocket";
import type { StatModule } from "@server/stats/types";

const MAX_HISTORY = 84;
const SAMPLE_INTERVAL_MS = 1500;

let serverRef: Bun.Server<any> | null = null;
let latest: WebSocketStat = sample();
let history: WebSocketStat[] = [];
let dirty = false;
let started = false;

function sample(): WebSocketStat {
  return {
    timestamp: Date.now(),
    pendingWebSockets: serverRef?.pendingWebSockets ?? 0,
    cursorSubscribers: serverRef?.subscriberCount("cursors") ?? 0,
  };
}

export const websocketStat: StatModule<WebSocketStat> & {
  start: (server: Bun.Server<any>) => void;
} = {
  start(server: Bun.Server<any>) {
    if (started) return;
    started = true;
    serverRef = server;

    const tick = () => {
      latest = sample();
      history.push(latest);
      if (history.length > MAX_HISTORY) history.shift();
      dirty = true;
    };

    tick();
    setInterval(tick, SAMPLE_INTERVAL_MS);
  },
  getLatest: () => latest,
  getHistory: () => [...history],
  consumeLatest() {
    if (!dirty) return null;
    dirty = false;
    return latest;
  },
};
