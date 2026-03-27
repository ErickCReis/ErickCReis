import { createSignal } from "solid-js";
import type { SystemStat } from "@shared/stats/system";
import { MAX_POINTS } from "@web/stats/utils";

type SystemHistoryPoint = Pick<
  SystemStat,
  "timestamp" | "cpuUsagePercent" | "systemMemoryUsedPercent"
>;

function toHistoryPoint(sample: SystemStat): SystemHistoryPoint {
  return {
    timestamp: sample.timestamp,
    cpuUsagePercent: sample.cpuUsagePercent,
    systemMemoryUsedPercent: sample.systemMemoryUsedPercent,
  };
}

const [latest, setLatest] = createSignal<SystemStat | null>(null);
const [history, setHistory] = createSignal<SystemHistoryPoint[]>([]);

export const systemStore = {
  latest,
  history,
  pushSample(data: SystemStat) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_POINTS));
  },
  loadHistory(data: SystemHistoryPoint[], latestSample: SystemStat) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, SystemHistoryPoint>();
      for (const s of prev) merged.set(s.timestamp, s);
      for (const s of data) merged.set(s.timestamp, s);
      return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_POINTS);
    });
  },
};
