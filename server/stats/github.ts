import * as v from "valibot";
import { gitHubCommitStatsSchema, type GitHubCommitStats } from "@shared/stats/github";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const GITHUB_POLL_INTERVAL_MS = 30 * 60 * 1000;
const GITHUB_RATE_LIMIT_FALLBACK_MS = 15 * 60 * 1000;
const DEFAULT_GITHUB_USERNAME = "ErickCReis";
const MAX_HISTORY = 84;
const DAILY_WINDOW_DAYS = 30;

const CONTRIBUTIONS_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

type ContributionDay = { date: string; contributionCount: number };

type GitHubGraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: { contributionDays?: ContributionDay[] }[];
        };
      };
    };
  };
  errors?: { message?: string }[];
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
    commitsLast30Days: Array.from({ length: DAILY_WINDOW_DAYS }, () => 0),
    commitsLast30DayLabels: Array.from({ length: DAILY_WINDOW_DAYS }, () => "--/--"),
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

async function fetchContributionDays(
  username: string,
  from: string,
  to: string,
): Promise<ContributionDay[]> {
  const token = getGitHubToken();
  if (!token) {
    throw new Error("GitHub GraphQL API requires GITHUB_TOKEN");
  }

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "erickcreis-site-telemetry",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { login: username, from, to },
    }),
  });

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0" || response.status === 429) {
      throw new GitHubRateLimitError(getRateLimitRetryAfterMs(response));
    }
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`GitHub GraphQL request failed (${response.status}): ${responseText}`);
  }

  const payload = (await response.json()) as GitHubGraphQLResponse;
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }

  const weeks = payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  return weeks.flatMap((week) => week.contributionDays ?? []);
}

function deriveLastCommitDate(byDate: Map<string, number>): string | null {
  let latestDate: string | null = null;
  for (const [date, count] of byDate) {
    if (count > 0 && (latestDate == null || date > latestDate)) latestDate = date;
  }
  return latestDate;
}

async function loadCache(): Promise<GitHubCommitStats | null> {
  const file = Bun.file(getCachePath());
  try {
    if (!(await file.exists())) return null;
    const parsed = v.safeParse(gitHubCommitStatsSchema, await file.json());
    if (!parsed.success || !parsed.output.fetchedAt) return null;
    return parsed.output;
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
  const monthStart = formatISODate(new Date(currentYear, now.getMonth(), 1));
  const today = formatISODate(now);

  try {
    // One GraphQL call returns the full year-to-date contribution calendar; we
    // derive the 30-day window, today, month, and year totals from it locally.
    const days = await fetchContributionDays(username, `${yearStart}T00:00:00Z`, now.toISOString());
    const byDate = new Map<string, number>();
    for (const day of days) {
      if (day.date >= yearStart && day.date <= today) {
        byDate.set(day.date, (byDate.get(day.date) ?? 0) + (day.contributionCount ?? 0));
      }
    }

    const last30Dates = getRecentDates(DAILY_WINDOW_DAYS);
    const commitsLast30Days = last30Dates.map((date) => byDate.get(formatISODate(date)) ?? 0);

    let commitsThisMonth = 0;
    let commitsThisYear = 0;
    for (const [date, count] of byDate) {
      commitsThisYear += count;
      if (date >= monthStart) commitsThisMonth += count;
    }

    const stats: GitHubCommitStats = {
      isConfigured: true,
      username,
      lastCommitDate: deriveLastCommitDate(byDate),
      commitsToday: byDate.get(today) ?? 0,
      commitsLast30Days,
      commitsLast30DayLabels: last30Dates.map((date) => date.getDate().toString().padStart(2, "0")),
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
      commitsLast30Days: [...latest.commitsLast30Days],
      commitsLast30DayLabels: [...latest.commitsLast30DayLabels],
    };
  },
  getHistory: () => [...history],
  getVersion: () => version,
};
