import type { GitHubCommitStats } from "@shared/telemetry";

const GITHUB_COMMIT_SEARCH_ENDPOINT = "https://api.github.com/search/commits";
const GITHUB_POLL_INTERVAL_MS = 30 * 60 * 1000;
const GITHUB_RATE_LIMIT_FALLBACK_MS = 15 * 60 * 1000;
const DEFAULT_GITHUB_USERNAME = "ErickCReis";

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

function createEmptyGitHubCommitStats(username: string): GitHubCommitStats {
  return {
    isConfigured: Boolean(username),
    username,
    year: new Date().getFullYear(),
    commitsYearToDate: 0,
    commitsLast7Days: Array.from({ length: 7 }, () => 0),
    commitsLast7DayLabels: Array.from({ length: 7 }, () => "--/--"),
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
    if (resetAtSeconds > nowSeconds) {
      return (resetAtSeconds - nowSeconds + 1) * 1000;
    }
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
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

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

let latestGitHubCommitStats = createEmptyGitHubCommitStats(getGitHubUsername());
let isGitHubPollerStarted = false;

async function refreshGitHubCommitStats() {
  const username = getGitHubUsername();
  if (!username) {
    latestGitHubCommitStats = createEmptyGitHubCommitStats(username);
    return GITHUB_POLL_INTERVAL_MS;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const today = formatISODate(now);

  const last7Dates = getRecentDates(7);
  const dailyRanges = last7Dates.map((date) => {
    const value = formatISODate(date);
    return { from: value, to: value };
  });

  try {
    const [commitsYearToDate, ...commitsLast7Days] = await Promise.all([
      fetchGitHubCommitCount(username, yearStart, today),
      ...dailyRanges.map((range) => fetchGitHubCommitCount(username, range.from, range.to)),
    ]);

    latestGitHubCommitStats = {
      isConfigured: true,
      username,
      year: currentYear,
      commitsYearToDate,
      commitsLast7Days,
      commitsLast7DayLabels: last7Dates.map(formatDayLabel),
      fetchedAt: Date.now(),
    };

    return GITHUB_POLL_INTERVAL_MS;
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      console.warn(`[github] Rate limited. Backing off for ${error.retryAfterMs}ms.`);
      return error.retryAfterMs;
    }

    console.error("[github] Failed to refresh commit stats", error);
    latestGitHubCommitStats = {
      ...createEmptyGitHubCommitStats(username),
      isConfigured: true,
      year: currentYear,
      fetchedAt: Date.now(),
    };

    return GITHUB_RATE_LIMIT_FALLBACK_MS;
  }
}

export function startGitHubPoller() {
  if (isGitHubPollerStarted) {
    return;
  }

  isGitHubPollerStarted = true;

  const tick = async () => {
    if (!isGitHubPollerStarted) {
      return;
    }

    const nextIntervalMs = await refreshGitHubCommitStats();
    if (!isGitHubPollerStarted) {
      return;
    }

    setTimeout(() => {
      void tick();
    }, nextIntervalMs);
  };

  void tick();
}

export function getLatestGitHubCommitStats(): GitHubCommitStats {
  return {
    ...latestGitHubCommitStats,
    commitsLast7Days: [...latestGitHubCommitStats.commitsLast7Days],
    commitsLast7DayLabels: [...latestGitHubCommitStats.commitsLast7DayLabels],
  };
}
