import { createSignal } from "solid-js";
import type { ServerInfoStat } from "@shared/stats/server";

const MAX_POINTS = 10;
type ServerHistoryPoint = Pick<
  ServerInfoStat,
  "timestamp" | "currentStreakSeconds" | "uptimePercent30d"
>;

function toHistoryPoint(sample: ServerInfoStat): ServerHistoryPoint {
  return {
    timestamp: sample.timestamp,
    currentStreakSeconds: sample.currentStreakSeconds,
    uptimePercent30d: sample.uptimePercent30d,
  };
}

const [latest, setLatest] = createSignal<ServerInfoStat | null>(null);
const [history, setHistory] = createSignal<ServerHistoryPoint[]>([]);

export const serverStore = {
  latest,
  history,
  pushSample(data: ServerInfoStat) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_POINTS));
  },
  loadHistory(data: ServerHistoryPoint[], latestSample: ServerInfoStat) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, ServerHistoryPoint>();
      for (const s of prev) merged.set(s.timestamp, s);
      for (const s of data) merged.set(s.timestamp, s);
      return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_POINTS);
    });
  },
};
