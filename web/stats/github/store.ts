import { createSignal } from "solid-js";
import type { GitHubCommitStats } from "@shared/stats/github";
import { MAX_POINTS } from "@web/stats/utils";

const [latest, setLatest] = createSignal<GitHubCommitStats | null>(null);
const [history, setHistory] = createSignal<GitHubCommitStats[]>([]);

export const githubStore = {
  latest,
  history,
  pushSample(data: GitHubCommitStats) {
    setLatest(data);
    setHistory((prev) => [...prev, data].slice(-MAX_POINTS));
  },
  loadHistory(data: GitHubCommitStats[]) {
    setHistory((prev) => {
      const merged = new Map<number, GitHubCommitStats>();
      for (const s of prev) merged.set(s.fetchedAt, s);
      for (const s of data) merged.set(s.fetchedAt, s);
      return [...merged.values()].sort((a, b) => a.fetchedAt - b.fetchedAt).slice(-MAX_POINTS);
    });
  },
};
