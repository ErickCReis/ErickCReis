export const STATUS_UP = 2;
export const UP_LOG_TYPES = new Set([2, 98]);
export const INTERRUPTION_LOG_TYPES = new Set([1, 99]);

export type UptimeRobotLog = {
  type?: number;
  datetime?: number;
};

export type UptimeRobotMonitor = {
  id?: number;
  status?: number;
  create_datetime?: number;
  custom_uptime_ranges?: string;
  custom_uptime_ratio?: string;
  custom_uptime_ratios?: string;
  logs?: UptimeRobotLog[];
};

export type UptimeDaySummary = {
  date: string;
  uptimePercent: number | null;
};

export const DAYS_IN_WINDOW = 30;
const MS_PER_DAY = 86_400_000;

export function formatUtcDate(ms: number) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getUtcDayStartMs(ms: number) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDailyRanges(nowMs: number) {
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

export function parsePercentList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split("-")
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part))
    .map((part) => Math.min(100, Math.max(0, Number(part.toFixed(2)))));
}

export function buildDailyUptime(nowMs: number, monitor: UptimeRobotMonitor): UptimeDaySummary[] {
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

export function getOverallUptime(dailyUptime: UptimeDaySummary[], monitor: UptimeRobotMonitor) {
  const ratio = parsePercentList(monitor.custom_uptime_ratio ?? monitor.custom_uptime_ratios)[0];
  if (ratio !== undefined) return ratio;
  const availableDays = dailyUptime.filter((day) => day.uptimePercent !== null);
  if (availableDays.length === 0) return 0;

  const total = availableDays.reduce((sum, day) => sum + (day.uptimePercent ?? 0), 0);
  return Number((total / availableDays.length).toFixed(2));
}

export function getCurrentStreakSeconds(nowMs: number, monitor: UptimeRobotMonitor) {
  if (monitor.status !== STATUS_UP) return 0;

  const logs = (monitor.logs ?? [])
    .filter((entry): entry is UptimeRobotLog & { datetime: number } =>
      Number.isFinite(entry.datetime),
    )
    .sort((left, right) => right.datetime - left.datetime);

  const latestLog = logs[0];
  if (latestLog) {
    if (INTERRUPTION_LOG_TYPES.has(latestLog.type ?? -1)) return 0;
    if (UP_LOG_TYPES.has(latestLog.type ?? -1)) {
      return Math.max(0, Math.floor(nowMs / 1000 - latestLog.datetime));
    }
    return 0;
  }

  const createdAt = Number.isFinite(monitor.create_datetime)
    ? Number(monitor.create_datetime)
    : null;
  if (!createdAt) return 0;
  return Math.max(0, Math.floor(nowMs / 1000 - createdAt));
}
