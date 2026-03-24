import { version } from "../../package.json";
import type { ServerInfoStat, UptimeDaySummary } from "@shared/stats/server";
import type { StatModule } from "@server/stats/types";

const UPTIMEROBOT_ENDPOINT = "https://api.uptimerobot.com/v2/getMonitors";
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_INTERVAL_MS = 60 * 1000;
const MAX_HISTORY = 10;
const DAYS_IN_WINDOW = 30;
const MS_PER_DAY = 86_400_000;
const STATUS_UP = 2;
const UP_LOG_TYPES = new Set([1, 98]);

type UptimeRobotLog = {
  type?: number;
  datetime?: number;
};

type UptimeRobotMonitor = {
  id?: number;
  status?: number;
  create_datetime?: number;
  custom_uptime_ranges?: string;
  custom_uptime_ratio?: string;
  custom_uptime_ratios?: string;
  logs?: UptimeRobotLog[];
};

type UptimeRobotResponse = {
  stat?: string;
  error?: { message?: string };
  monitors?: UptimeRobotMonitor[];
};

function getApiKey() {
  return Bun.env.UPTIMEROBOT_API_KEY?.trim() || null;
}

function getMonitorId() {
  const raw = Bun.env.UPTIMEROBOT_MONITOR_ID?.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyStat(now = Date.now()): ServerInfoStat {
  return {
    timestamp: now,
    appVersion: version,
    currentStreakSeconds: 0,
    uptimePercent30d: 0,
    dailyUptime: [],
  };
}

function formatUtcDate(ms: number) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUtcDayStartMs(ms: number) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getDailyRanges(nowMs: number) {
  return Array.from({ length: DAYS_IN_WINDOW }, (_, index) => {
    const daysAgo = DAYS_IN_WINDOW - index - 1;
    const startMs = getUtcDayStartMs(nowMs - daysAgo * MS_PER_DAY);
    const endMs = index === DAYS_IN_WINDOW - 1 ? nowMs : startMs + MS_PER_DAY;

    return {
      date: formatUtcDate(startMs),
      startUnix: Math.floor(startMs / 1000),
      endUnix: Math.floor(endMs / 1000),
    };
  });
}

function parsePercentList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split("-")
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part))
    .map((part) => Math.min(100, Math.max(0, Number(part.toFixed(2)))));
}

function buildRequestBody(nowMs: number) {
  const body = new URLSearchParams({
    api_key: getApiKey() ?? "",
    format: "json",
    custom_uptime_ratios: `${DAYS_IN_WINDOW}`,
    custom_uptime_ranges: getDailyRanges(nowMs)
      .map((range) => `${range.startUnix}_${range.endUnix}`)
      .join("-"),
    logs: "1",
  });

  const monitorId = getMonitorId();
  if (monitorId !== null) body.set("monitors", `${monitorId}`);

  return body;
}

function pickMonitor(monitors: UptimeRobotMonitor[]) {
  const monitorId = getMonitorId();
  if (monitorId === null) return monitors[0] ?? null;
  return monitors.find((monitor) => monitor.id === monitorId) ?? null;
}

async function fetchMonitor(nowMs: number) {
  const response = await fetch(UPTIMEROBOT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: buildRequestBody(nowMs),
  });

  if (!response.ok) {
    throw new Error(`UptimeRobot request failed (${response.status})`);
  }

  const payload = (await response.json()) as UptimeRobotResponse;
  if (payload.stat !== "ok") {
    throw new Error(payload.error?.message?.trim() || "UptimeRobot API error");
  }

  const monitor = pickMonitor(payload.monitors ?? []);
  if (!monitor) throw new Error("No UptimeRobot monitor was returned");
  return monitor;
}

function buildDailyUptime(nowMs: number, monitor: UptimeRobotMonitor): UptimeDaySummary[] {
  const ranges = getDailyRanges(nowMs);
  const percents = parsePercentList(monitor.custom_uptime_ranges);
  const createdAtMs = Number.isFinite(monitor.create_datetime)
    ? Number(monitor.create_datetime) * 1000
    : null;

  return ranges.map((range, index) => ({
    date: range.date,
    uptimePercent:
      createdAtMs !== null && range.endUnix * 1000 <= createdAtMs ? null : (percents[index] ?? 0),
  }));
}

function getOverallUptime(dailyUptime: UptimeDaySummary[], monitor: UptimeRobotMonitor) {
  const ratio = parsePercentList(monitor.custom_uptime_ratio ?? monitor.custom_uptime_ratios)[0];
  if (ratio !== undefined) return ratio;
  const availableDays = dailyUptime.filter((day) => day.uptimePercent !== null);
  if (availableDays.length === 0) return 0;

  const total = availableDays.reduce((sum, day) => sum + (day.uptimePercent ?? 0), 0);
  return Number((total / availableDays.length).toFixed(2));
}

function getCurrentStreakSeconds(nowMs: number, monitor: UptimeRobotMonitor) {
  if (monitor.status !== STATUS_UP) return 0;

  const startedAt = (monitor.logs ?? [])
    .filter((entry) => UP_LOG_TYPES.has(entry.type ?? -1))
    .map((entry) => entry.datetime)
    .filter((value): value is number => Number.isFinite(value))
    .sort((left, right) => right - left)[0];

  if (!startedAt) return 0;
  return Math.max(0, Math.floor(nowMs / 1000 - startedAt));
}

function buildSnapshot(nowMs: number, monitor: UptimeRobotMonitor): ServerInfoStat {
  const dailyUptime = buildDailyUptime(nowMs, monitor);

  return {
    timestamp: nowMs,
    appVersion: version,
    currentStreakSeconds: getCurrentStreakSeconds(nowMs, monitor),
    uptimePercent30d: getOverallUptime(dailyUptime, monitor),
    dailyUptime,
  };
}

let latest: ServerInfoStat = createEmptyStat();
let history: ServerInfoStat[] = [];
let statVersion = 0;
let started = false;

function pushSnapshot(snapshot: ServerInfoStat) {
  latest = snapshot;
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  statVersion++;
}

async function refreshServerStats() {
  const nowMs = Date.now();

  if (!getApiKey()) {
    pushSnapshot(createEmptyStat(nowMs));
    return POLL_INTERVAL_MS;
  }

  try {
    const monitor = await fetchMonitor(nowMs);
    pushSnapshot(buildSnapshot(nowMs, monitor));
    return POLL_INTERVAL_MS;
  } catch (error) {
    console.error("[server] Failed to refresh uptime stats", error);
    pushSnapshot(createEmptyStat(nowMs));
    return RETRY_INTERVAL_MS;
  }
}

export const serverInfoStat: StatModule<ServerInfoStat> = {
  start() {
    if (started) return;
    started = true;

    const tick = async () => {
      if (!started) return;
      const nextDelay = await refreshServerStats();
      if (!started) return;
      setTimeout(() => void tick(), nextDelay);
    };

    void tick();
  },
  getLatest: () => ({
    ...latest,
    dailyUptime: latest.dailyUptime.map((day) => ({ ...day })),
  }),
  getHistory: () =>
    history.map((snapshot) => ({
      ...snapshot,
      dailyUptime: snapshot.dailyUptime.map((day) => ({ ...day })),
    })),
  getVersion: () => statVersion,
};
