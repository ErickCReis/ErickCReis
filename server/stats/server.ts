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
let countRangeStmt: ReturnType<Database["prepare"]> | null = null;

function initDb() {
  db = new Database(getDataPath("uptime.db"));
  db.run("PRAGMA journal_mode=WAL");
  db.run("CREATE TABLE IF NOT EXISTS heartbeats (ts INTEGER PRIMARY KEY)");

  insertStmt = db.prepare("INSERT OR IGNORE INTO heartbeats (ts) VALUES (?)");
  countRangeStmt = db.prepare("SELECT COUNT(*) as cnt FROM heartbeats WHERE ts >= ? AND ts < ?");
}

function recordHeartbeat() {
  const ts = Math.floor(Date.now() / 1000);
  insertStmt?.run(ts);
}

function countBeatsInRange(startUnix: number, endUnix: number): number {
  const row = countRangeStmt?.get(startUnix, endUnix) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

function computeDailyUptime(): UptimeDaySummary[] {
  const now = new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);
  const days: UptimeDaySummary[] = [];

  for (let offset = 29; offset >= 0; offset--) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const dateStr = formatDate(date);
    const start = dayStartUnix(date);
    const end = offset === 0 ? nowUnix : start + SECONDS_PER_DAY;

    const actual = countBeatsInRange(start, end);
    const elapsed = end - start;
    const expected = Math.max(1, Math.floor(elapsed / HEARTBEAT_PERIOD_S));
    const pct = Math.min(100, Number(((actual / expected) * 100).toFixed(2)));

    days.push({ date: dateStr, uptimePercent: pct });
  }

  return days;
}

function computeOverallUptime30d(daily: UptimeDaySummary[]): number {
  if (daily.length === 0) return 0;
  const sum = daily.reduce((acc, d) => acc + d.uptimePercent, 0);
  return Number((sum / daily.length).toFixed(2));
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
    dailyUptime: daily,
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

    setInterval(recordHeartbeat, HEARTBEAT_INTERVAL_MS);
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
