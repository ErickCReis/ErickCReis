import { createSignal } from "solid-js";
import type { GitHubCommitStats } from "@shared/stats/github";
import { MAX_POINTS } from "@web/stats/utils";

type GitHubHistoryPoint = Pick<
  GitHubCommitStats,
  "fetchedAt" | "lastCommitDate" | "commitsToday" | "commitsThisMonth" | "commitsThisYear"
>;

function toHistoryPoint(sample: GitHubCommitStats): GitHubHistoryPoint {
  return {
    fetchedAt: sample.fetchedAt,
    lastCommitDate: sample.lastCommitDate,
    commitsToday: sample.commitsToday,
    commitsThisMonth: sample.commitsThisMonth,
    commitsThisYear: sample.commitsThisYear,
  };
}

const [latest, setLatest] = createSignal<GitHubCommitStats | null>(null);
const [history, setHistory] = createSignal<GitHubHistoryPoint[]>([]);

export const githubStore = {
  latest,
  history,
  pushSample(data: GitHubCommitStats) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_POINTS));
  },
  loadHistory(data: GitHubHistoryPoint[], latestSample: GitHubCommitStats) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, GitHubHistoryPoint>();
      for (const s of prev) merged.set(s.fetchedAt, s);
      for (const s of data) merged.set(s.fetchedAt, s);
      return [...merged.values()].sort((a, b) => a.fetchedAt - b.fetchedAt).slice(-MAX_POINTS);
    });
  },
};
