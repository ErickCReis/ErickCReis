import { version } from "../../package.json";
import type { ServerInfoStat } from "@shared/stats/server";
import type { StatModule } from "@server/stats/types";
import {
  buildDailyUptime,
  DAYS_IN_WINDOW,
  getCurrentStreakSeconds,
  getDailyRanges,
  getOverallUptime,
  type UptimeRobotMonitor,
} from "@server/stats/uptime";

const UPTIMEROBOT_ENDPOINT = "https://api.uptimerobot.com/v2/getMonitors";
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_INTERVAL_MS = 60 * 1000;
const MAX_HISTORY = 10;
const STREAK_LOG_LIMIT = 50;

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

function buildRequestBody(nowMs: number) {
  const body = new URLSearchParams({
    api_key: getApiKey() ?? "",
    format: "json",
    custom_uptime_ratios: `${DAYS_IN_WINDOW}`,
    custom_uptime_ranges: getDailyRanges(nowMs)
      .map((range) => `${range.startUnix}_${range.endUnix}`)
      .join("-"),
    logs: "1",
    log_types: "1-2-98-99",
    logs_limit: `${STREAK_LOG_LIMIT}`,
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
let hasSuccessfulFetch = false;

function pushSnapshot(snapshot: ServerInfoStat) {
  latest = snapshot;
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  statVersion++;
}

async function refreshServerStats() {
  const nowMs = Date.now();

  if (!getApiKey()) {
    hasSuccessfulFetch = false;
    pushSnapshot(createEmptyStat(nowMs));
    return POLL_INTERVAL_MS;
  }

  try {
    const monitor = await fetchMonitor(nowMs);
    pushSnapshot(buildSnapshot(nowMs, monitor));
    hasSuccessfulFetch = true;
    return POLL_INTERVAL_MS;
  } catch (error) {
    console.error("[server] Failed to refresh uptime stats", error);
    if (!hasSuccessfulFetch) {
      pushSnapshot(createEmptyStat(nowMs));
    }
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
