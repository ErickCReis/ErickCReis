import { createSignal } from "solid-js";
import type { CodexUsageSnapshot } from "@shared/stats/codex";
import { MAX_POINTS } from "@web/stats/utils";

const [latest, setLatest] = createSignal<CodexUsageSnapshot | null>(null);
const [history, setHistory] = createSignal<CodexUsageSnapshot[]>([]);

export const codexStore = {
  latest,
  history,
  pushSample(data: CodexUsageSnapshot) {
    setLatest(data);
    setHistory((prev) => [...prev, data].slice(-MAX_POINTS));
  },
  loadHistory(data: CodexUsageSnapshot[]) {
    setHistory((prev) => {
      const seen = new Set<number>();
      const merged = [...prev, ...data].filter((s) => {
        if (s.generatedAt == null) return true;
        if (seen.has(s.generatedAt)) return false;
        seen.add(s.generatedAt);
        return true;
      });
      const sorted = merged
        .sort((a, b) => (a.generatedAt ?? 0) - (b.generatedAt ?? 0))
        .slice(-MAX_POINTS);
      if (sorted.length > 0) setLatest(sorted.at(-1)!);
      return sorted;
    });
  },
};
