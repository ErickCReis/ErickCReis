import { createSignal } from "solid-js";
import type { SystemStat } from "@shared/stats/system";
import { MAX_POINTS } from "@web/stats/utils";

const [latest, setLatest] = createSignal<SystemStat | null>(null);
const [history, setHistory] = createSignal<SystemStat[]>([]);

export const systemStore = {
  latest,
  history,
  pushSample(data: SystemStat) {
    setLatest(data);
    setHistory((prev) => [...prev, data].slice(-MAX_POINTS));
  },
  loadHistory(data: SystemStat[]) {
    setHistory((prev) => {
      const merged = new Map<number, SystemStat>();
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
