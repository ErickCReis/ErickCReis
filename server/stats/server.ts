import { Database } from "bun:sqlite";
import { version } from "../../package.json";
import type { ServerInfoStat, UptimeDaySummary } from "@shared/stats/server";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const HEARTBEAT_INTERVAL_MS = 5_000;
const RECOMPUTE_INTERVAL_MS = 30_000;
const SECONDS_PER_DAY = 86_400;
const HEARTBEAT_PERIOD_S = 5;
const GAP_TOLERANCE_S = 10;
const RETENTION_DAYS = 31;
const MAX_HISTORY = 10;
// First calendar day when uptime monitoring is considered valid.
const UPTIME_MONITORING_START_DATE = new Date(2026, 2, 3);

type ComputedUptimeDay = UptimeDaySummary & {
  actualBuckets: number;
  expectedBuckets: number;
};

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayStartUnix(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

let db: Database | null = null;
let insertStmt: ReturnType<Database["prepare"]> | null = null;
let countBucketRangeStmt: ReturnType<Database["prepare"]> | null = null;
let firstHeartbeatStmt: ReturnType<Database["prepare"]> | null = null;

function initDb() {
  db = new Database(getDataPath("uptime.db"));
  db.run("PRAGMA journal_mode=WAL");
  db.run("CREATE TABLE IF NOT EXISTS heartbeats (ts INTEGER PRIMARY KEY)");

  insertStmt = db.prepare("INSERT OR IGNORE INTO heartbeats (ts) VALUES (?)");
  countBucketRangeStmt = db.prepare(
    `SELECT COUNT(DISTINCT CAST(ts / ${HEARTBEAT_PERIOD_S} AS INTEGER)) as cnt
     FROM heartbeats
     WHERE ts >= ? AND ts < ?`,
  );
  firstHeartbeatStmt = db.prepare("SELECT MIN(ts) as ts FROM heartbeats");
}

function recordHeartbeat() {
  const ts = Math.floor(Date.now() / 1000);
  insertStmt?.run(ts);
}

function alignRangeStartToBucket(startUnix: number): number {
  return Math.ceil(startUnix / HEARTBEAT_PERIOD_S) * HEARTBEAT_PERIOD_S;
}

function alignRangeEndToBucket(endUnix: number): number {
  return Math.floor(endUnix / HEARTBEAT_PERIOD_S) * HEARTBEAT_PERIOD_S;
}

function countBucketsInRange(startUnix: number, endUnix: number): number {
  const row = countBucketRangeStmt?.get(startUnix, endUnix) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

function getFirstHeartbeatUnix(): number | null {
  const row = firstHeartbeatStmt?.get() as { ts: number | null } | undefined;
  return row?.ts ?? null;
}

function computeDailyUptime(): ComputedUptimeDay[] {
  const now = new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);
  const configuredStartUnix = dayStartUnix(UPTIME_MONITORING_START_DATE);
  const firstHeartbeatUnix = getFirstHeartbeatUnix();
  const uptimeStartUnix = Math.max(configuredStartUnix, firstHeartbeatUnix ?? nowUnix);
  const days: ComputedUptimeDay[] = [];

  for (let offset = 29; offset >= 0; offset--) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const dateStr = formatDate(date);
    const start = dayStartUnix(date);
    const end = offset === 0 ? nowUnix : start + SECONDS_PER_DAY;
    if (end <= uptimeStartUnix) continue;
    const sampleStart = Math.max(start, uptimeStartUnix);

    const alignedStart = alignRangeStartToBucket(sampleStart);
    const alignedEnd = alignRangeEndToBucket(end);
    const elapsed = alignedEnd - alignedStart;
    if (elapsed <= 0) continue;

    const actualBuckets = countBucketsInRange(alignedStart, alignedEnd);
    const expectedBuckets = elapsed / HEARTBEAT_PERIOD_S;
    const pct = Math.min(100, Number(((actualBuckets / expectedBuckets) * 100).toFixed(2)));

    days.push({ date: dateStr, uptimePercent: pct, actualBuckets, expectedBuckets });
  }

  return days;
}

function computeOverallUptime30d(daily: ComputedUptimeDay[]): number {
  if (daily.length === 0) return 0;
  const actualBuckets = daily.reduce((acc, d) => acc + d.actualBuckets, 0);
  const expectedBuckets = daily.reduce((acc, d) => acc + d.expectedBuckets, 0);
  if (expectedBuckets <= 0) return 0;
  return Number(((actualBuckets / expectedBuckets) * 100).toFixed(2));
}

function scheduleNextHeartbeat() {
  const now = Date.now();
  const delay = HEARTBEAT_INTERVAL_MS - (now % HEARTBEAT_INTERVAL_MS) || HEARTBEAT_INTERVAL_MS;

  setTimeout(() => {
    recordHeartbeat();
    scheduleNextHeartbeat();
  }, delay);
}

function computeCurrentStreak(): number {
  if (!db) return 0;

  const nowUnix = Math.floor(Date.now() / 1000);
  const lookback = nowUnix - RETENTION_DAYS * SECONDS_PER_DAY;

  const rows = db
    .prepare("SELECT ts FROM heartbeats WHERE ts >= ? ORDER BY ts DESC")
    .all(lookback) as { ts: number }[];

  if (rows.length === 0) return 0;

  let streakEnd = nowUnix;
  let streakStart = rows[0].ts;

  if (nowUnix - rows[0].ts > GAP_TOLERANCE_S) return 0;

  for (let i = 1; i < rows.length; i++) {
    const gap = rows[i - 1].ts - rows[i].ts;
    if (gap > GAP_TOLERANCE_S) break;
    streakStart = rows[i].ts;
  }

  return streakEnd - streakStart;
}

function buildSnapshot(): ServerInfoStat {
  const daily = computeDailyUptime();
  return {
    timestamp: Date.now(),
    appVersion: version,
    currentStreakSeconds: computeCurrentStreak(),
    uptimePercent30d: computeOverallUptime30d(daily),
    dailyUptime: daily.map(({ date, uptimePercent }) => ({ date, uptimePercent })),
  };
}

let latest: ServerInfoStat = {
  timestamp: Date.now(),
  appVersion: version,
  currentStreakSeconds: 0,
  uptimePercent30d: 0,
  dailyUptime: [],
};
let history: ServerInfoStat[] = [];
let statVersion = 0;
let started = false;

function performRetentionPurge() {
  if (!db) return;
  try {
    const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * SECONDS_PER_DAY;
    db.run("DELETE FROM heartbeats WHERE ts < ?", [cutoff]);
  } catch (error) {
    console.error("[server] Retention purge failed", error);
  }
}

const RETENTION_PURGE_INTERVAL_MS = 3_600_000;

export const serverInfoStat: StatModule<ServerInfoStat> = {
  start() {
    if (started) return;
    started = true;

    initDb();
    performRetentionPurge();
    recordHeartbeat();
    latest = buildSnapshot();
    history.push(latest);
    statVersion++;

    scheduleNextHeartbeat();
    setInterval(performRetentionPurge, RETENTION_PURGE_INTERVAL_MS);

    setInterval(() => {
      latest = buildSnapshot();
      history.push(latest);
      if (history.length > MAX_HISTORY) history.shift();
      statVersion++;
    }, RECOMPUTE_INTERVAL_MS);
  },
  getLatest: () => ({
    ...latest,
    dailyUptime: latest.dailyUptime.map((d) => ({ ...d })),
  }),
  getHistory: () =>
    history.map((s) => ({
      ...s,
      dailyUptime: s.dailyUptime.map((d) => ({ ...d })),
    })),
  getVersion: () => statVersion,
};
