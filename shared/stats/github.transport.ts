import type { GitHubCommitStats } from "@shared/stats/github";

export type GitHubHistoryPoint = Pick<
  GitHubCommitStats,
  "fetchedAt" | "lastCommitDate" | "commitsToday" | "commitsThisMonth" | "commitsThisYear"
>;

export type GitHubCommitStatsTuple = [
  boolean,
  string,
  string | null,
  number,
  number[],
  string[],
  number,
  number,
  number,
];

export type GitHubHistoryPointTuple = [number, string | null, number, number, number];

export function serializeGitHubCommitStats(sample: GitHubCommitStats): GitHubCommitStatsTuple {
  return [
    sample.isConfigured,
    sample.username,
    sample.lastCommitDate,
    sample.commitsToday,
    sample.commitsLast7Days,
    sample.commitsLast7DayLabels,
    sample.commitsThisMonth,
    sample.commitsThisYear,
    sample.fetchedAt,
  ];
}

export function deserializeGitHubCommitStats(tuple: GitHubCommitStatsTuple): GitHubCommitStats {
  return {
    isConfigured: tuple[0],
    username: tuple[1],
    lastCommitDate: tuple[2],
    commitsToday: tuple[3],
    commitsLast7Days: tuple[4],
    commitsLast7DayLabels: tuple[5],
    commitsThisMonth: tuple[6],
    commitsThisYear: tuple[7],
    fetchedAt: tuple[8],
  };
}

export function serializeGitHubHistoryPoint(sample: GitHubHistoryPoint): GitHubHistoryPointTuple {
  return [
    sample.fetchedAt,
    sample.lastCommitDate,
    sample.commitsToday,
    sample.commitsThisMonth,
    sample.commitsThisYear,
  ];
}

export function deserializeGitHubHistoryPoint(tuple: GitHubHistoryPointTuple): GitHubHistoryPoint {
  return {
    fetchedAt: tuple[0],
    lastCommitDate: tuple[1],
    commitsToday: tuple[2],
    commitsThisMonth: tuple[3],
    commitsThisYear: tuple[4],
  };
}
