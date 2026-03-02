import { createSignal } from "solid-js";
import type { ServerInfoStat } from "@shared/stats/server";
import { MAX_POINTS } from "@web/stats/utils";

const [latest, setLatest] = createSignal<ServerInfoStat | null>(null);
const [history, setHistory] = createSignal<ServerInfoStat[]>([]);

export const serverStore = {
  latest,
  history,
  pushSample(data: ServerInfoStat) {
    setLatest(data);
    setHistory((prev) => [...prev, data].slice(-MAX_POINTS));
  },
  loadHistory(data: ServerInfoStat[]) {
    setHistory((prev) => {
      const merged = new Map<number, ServerInfoStat>();
      for (const s of prev) merged.set(s.timestamp, s);
      for (const s of data) merged.set(s.timestamp, s);
      return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_POINTS);
    });
  },
};
