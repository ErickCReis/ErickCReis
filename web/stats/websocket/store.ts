import { createSignal } from "solid-js";
import type { WebSocketStat } from "@shared/stats/websocket";

const MAX_POINTS = 84;
type WebSocketHistoryPoint = Pick<WebSocketStat, "timestamp" | "connectedUsers">;

function toHistoryPoint(sample: WebSocketStat): WebSocketHistoryPoint {
  return {
    timestamp: sample.timestamp,
    connectedUsers: sample.connectedUsers,
  };
}

const [latest, setLatest] = createSignal<WebSocketStat | null>(null);
const [history, setHistory] = createSignal<WebSocketHistoryPoint[]>([]);

export const websocketStore = {
  latest,
  history,
  pushSample(data: WebSocketStat) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_POINTS));
  },
  loadHistory(data: WebSocketHistoryPoint[], latestSample: WebSocketStat) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, WebSocketHistoryPoint>();
      for (const s of prev) merged.set(s.timestamp, s);
      for (const s of data) merged.set(s.timestamp, s);
      return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_POINTS);
    });
  },
};
