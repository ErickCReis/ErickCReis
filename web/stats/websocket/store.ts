import { createSignal } from "solid-js";
import type { WebSocketStat } from "@shared/stats/websocket";

const MAX_POINTS = 84;

const [latest, setLatest] = createSignal<WebSocketStat | null>(null);
const [history, setHistory] = createSignal<WebSocketStat[]>([]);

export const websocketStore = {
  latest,
  history,
  pushSample(data: WebSocketStat) {
    setLatest(data);
    setHistory((prev) => [...prev, data].slice(-MAX_POINTS));
  },
  loadHistory(data: WebSocketStat[]) {
    setHistory((prev) => {
      const merged = new Map<number, WebSocketStat>();
      for (const s of prev) merged.set(s.timestamp, s);
      for (const s of data) merged.set(s.timestamp, s);
      const sorted = [...merged.values()]
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-MAX_POINTS);
      if (sorted.length > 0) setLatest(sorted.at(-1)!);
      return sorted;
    });
  },
};
