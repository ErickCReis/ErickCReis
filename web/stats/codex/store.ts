import { createSignal } from "solid-js";
import type { CodexUsageSnapshot } from "@shared/stats/codex";
import { MAX_POINTS } from "@web/stats/utils";

type CodexHistoryPoint = Pick<
  CodexUsageSnapshot,
  "timestamp" | "generatedAt" | "isStale" | "todayTokens" | "totalTokens30d"
>;

function toHistoryPoint(sample: CodexUsageSnapshot): CodexHistoryPoint {
  return {
    timestamp: sample.timestamp,
    generatedAt: sample.generatedAt,
    isStale: sample.isStale,
    todayTokens: sample.todayTokens,
    totalTokens30d: sample.totalTokens30d,
  };
}

const [latest, setLatest] = createSignal<CodexUsageSnapshot | null>(null);
const [history, setHistory] = createSignal<CodexHistoryPoint[]>([]);

export const codexStore = {
  latest,
  history,
  pushSample(data: CodexUsageSnapshot) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_POINTS));
  },
  loadHistory(data: CodexHistoryPoint[], latestSample: CodexUsageSnapshot) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, CodexHistoryPoint>();
      for (const sample of prev) merged.set(sample.timestamp, sample);
      for (const sample of data) merged.set(sample.timestamp, sample);
      return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-MAX_POINTS);
    });
  },
};
