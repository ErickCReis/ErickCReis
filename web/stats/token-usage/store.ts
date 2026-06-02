import { createSignal } from "solid-js";
import type { TokenUsageSnapshot } from "@shared/stats/token-usage";

const MAX_TOKEN_USAGE_HISTORY_POINTS = 30;

type TokenUsageHistoryPoint = Pick<
  TokenUsageSnapshot,
  "timestamp" | "generatedAt" | "isStale" | "todayTokens" | "totalTokens30d"
>;

function toHistoryPoint(sample: TokenUsageSnapshot): TokenUsageHistoryPoint {
  return {
    timestamp: sample.timestamp,
    generatedAt: sample.generatedAt,
    isStale: sample.isStale,
    todayTokens: sample.todayTokens,
    totalTokens30d: sample.totalTokens30d,
  };
}

const [latest, setLatest] = createSignal<TokenUsageSnapshot | null>(null);
const [history, setHistory] = createSignal<TokenUsageHistoryPoint[]>([]);

export const tokenUsageStore = {
  latest,
  history,
  pushSample(data: TokenUsageSnapshot) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_TOKEN_USAGE_HISTORY_POINTS));
  },
  loadHistory(data: TokenUsageHistoryPoint[], latestSample: TokenUsageSnapshot) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, TokenUsageHistoryPoint>();
      for (const sample of prev) merged.set(sample.timestamp, sample);
      for (const sample of data) merged.set(sample.timestamp, sample);
      return [...merged.values()]
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-MAX_TOKEN_USAGE_HISTORY_POINTS);
    });
  },
};
