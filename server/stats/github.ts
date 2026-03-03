import type { GitHubCommitStats } from "@shared/stats/github";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const GITHUB_COMMIT_SEARCH_ENDPOINT = "https://api.github.com/search/commits";
const GITHUB_POLL_INTERVAL_MS = 30 * 60 * 1000;
const GITHUB_RATE_LIMIT_FALLBACK_MS = 15 * 60 * 1000;
const DEFAULT_GITHUB_USERNAME = "ErickCReis";
const MAX_HISTORY = 84;

type GitHubSearchResponse = {
  total_count?: number;
};

class GitHubRateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("GitHub API rate limited");
    this.retryAfterMs = retryAfterMs;
  }
}

function getGitHubToken() {
  return Bun.env.GITHUB_TOKEN?.trim() || null;
}

function getGitHubUsername() {
  return Bun.env.GITHUB_USERNAME?.trim() || DEFAULT_GITHUB_USERNAME;
}

function getCachePath() {
  return getDataPath("github-cache.json");
}

function createEmptyStats(username: string): GitHubCommitStats {
  return {
    isConfigured: Boolean(username),
    username,
    lastCommitDate: null,
    commitsToday: 0,
    commitsLast7Days: Array.from({ length: 7 }, () => 0),
    commitsLast7DayLabels: Array.from({ length: 7 }, () => "--/--"),
    commitsThisMonth: 0,
    commitsThisYear: 0,
    fetchedAt: Date.now(),
  };
}

function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}/${day}`;
}

function getRecentDates(totalDays: number) {
  const dates: Date[] = [];
  const now = new Date();
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - offset);
    dates.push(date);
  }
  return dates;
}

function getRateLimitRetryAfterMs(response: Response) {
  const resetAtSeconds = Number.parseInt(response.headers.get("x-ratelimit-reset") ?? "", 10);
  if (Number.isFinite(resetAtSeconds)) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (resetAtSeconds > nowSeconds) return (resetAtSeconds - nowSeconds + 1) * 1000;
  }
  return GITHUB_RATE_LIMIT_FALLBACK_MS;
}

async function fetchGitHubCommitCount(username: string, from: string, to: string) {
  const query = `author:${username} author-date:${from}..${to}`;
  const url = new URL(GITHUB_COMMIT_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", "1");

  const headers: Record<string, string> = {
    accept: "application/vnd.github.cloak-preview+json",
    "user-agent": "erickcreis-site-telemetry",
  };

  const token = getGitHubToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers });

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0" || response.status === 429) {
      throw new GitHubRateLimitError(getRateLimitRetryAfterMs(response));
    }
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`GitHub commit search failed (${response.status}): ${responseText}`);
  }

  const payload = (await response.json()) as GitHubSearchResponse;
  return Number.isFinite(payload.total_count) ? Number(payload.total_count) : 0;
}

function deriveLastCommitDate(commitsLast7Days: number[], last7Dates: Date[]): string | null {
  for (let i = commitsLast7Days.length - 1; i >= 0; i--) {
    if (commitsLast7Days[i] > 0) return formatISODate(last7Dates[i]);
  }
  return null;
}

async function loadCache(): Promise<GitHubCommitStats | null> {
  const file = Bun.file(getCachePath());
  try {
    if (!(await file.exists())) return null;
    const data = (await file.json()) as GitHubCommitStats;
    if (!data.fetchedAt) return null;
    return data;
  } catch {
    return null;
  }
}

async function saveCache(stats: GitHubCommitStats): Promise<void> {
  try {
    await Bun.write(getCachePath(), JSON.stringify(stats));
  } catch (error) {
    console.error("[github] Failed to write cache", error);
  }
}

let latest: GitHubCommitStats = createEmptyStats(getGitHubUsername());
let history: GitHubCommitStats[] = [];
let version = 0;
let started = false;

function markDirty(stats: GitHubCommitStats) {
  latest = stats;
  history.push(latest);
  if (history.length > MAX_HISTORY) history.shift();
  version++;
}

async function refreshGitHubCommitStats() {
  const username = getGitHubUsername();
  if (!username) {
    markDirty(createEmptyStats(username));
    return GITHUB_POLL_INTERVAL_MS;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const monthStart = `${currentYear}-${`${now.getMonth() + 1}`.padStart(2, "0")}-01`;
  const today = formatISODate(now);

  const last7Dates = getRecentDates(7);
  const dailyRanges = last7Dates.map((date) => {
    const value = formatISODate(date);
    return { from: value, to: value };
  });

  try {
    const [commitsThisYear, commitsThisMonth, ...commitsLast7Days] = await Promise.all([
      fetchGitHubCommitCount(username, yearStart, today),
      fetchGitHubCommitCount(username, monthStart, today),
      ...dailyRanges.map((range) => fetchGitHubCommitCount(username, range.from, range.to)),
    ]);

    const stats: GitHubCommitStats = {
      isConfigured: true,
      username,
      lastCommitDate: deriveLastCommitDate(commitsLast7Days, last7Dates),
      commitsToday: commitsLast7Days.at(-1) ?? 0,
      commitsLast7Days,
      commitsLast7DayLabels: last7Dates.map(formatDayLabel),
      commitsThisMonth,
      commitsThisYear,
      fetchedAt: Date.now(),
    };

    markDirty(stats);
    await saveCache(stats);

    return GITHUB_POLL_INTERVAL_MS;
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      console.warn(`[github] Rate limited. Backing off for ${error.retryAfterMs}ms.`);
      return error.retryAfterMs;
    }

    console.error("[github] Failed to refresh commit stats", error);
    markDirty({
      ...createEmptyStats(username),
      isConfigured: true,
      fetchedAt: Date.now(),
    });

    return GITHUB_RATE_LIMIT_FALLBACK_MS;
  }
}

export const githubStat: StatModule<GitHubCommitStats> = {
  async start() {
    if (started) return;
    started = true;

    const cached = await loadCache();
    if (cached && Date.now() - cached.fetchedAt < GITHUB_POLL_INTERVAL_MS) {
      console.log("[github] Using cached data from disk");
      markDirty(cached);

      setTimeout(
        () => {
          const tick = async () => {
            if (!started) return;
            const nextIntervalMs = await refreshGitHubCommitStats();
            if (!started) return;
            setTimeout(() => void tick(), nextIntervalMs);
          };
          void tick();
        },
        GITHUB_POLL_INTERVAL_MS - (Date.now() - cached.fetchedAt),
      );
      return;
    }

    const tick = async () => {
      if (!started) return;
      const nextIntervalMs = await refreshGitHubCommitStats();
      if (!started) return;
      setTimeout(() => void tick(), nextIntervalMs);
    };

    void tick();
  },
  getLatest() {
    return {
      ...latest,
      commitsLast7Days: [...latest.commitsLast7Days],
      commitsLast7DayLabels: [...latest.commitsLast7DayLabels],
    };
  },
  getHistory: () => [...history],
  getVersion: () => version,
};
