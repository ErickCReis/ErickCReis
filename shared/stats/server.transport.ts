import type { ServerInfoStat } from "@shared/stats/server";

export type ServerHistoryPoint = Pick<
  ServerInfoStat,
  "timestamp" | "currentStreakSeconds" | "uptimePercent30d"
>;

export type ServerInfoStatTuple = [number, string, number, number, Array<[string, number | null]>];
export type ServerHistoryPointTuple = [number, number, number];

export function serializeServerInfoStat(sample: ServerInfoStat): ServerInfoStatTuple {
  return [
    sample.timestamp,
    sample.appVersion,
    sample.currentStreakSeconds,
    sample.uptimePercent30d,
    sample.dailyUptime.map((day) => [day.date, day.uptimePercent]),
  ];
}

export function deserializeServerInfoStat(tuple: ServerInfoStatTuple): ServerInfoStat {
  return {
    timestamp: tuple[0],
    appVersion: tuple[1],
    currentStreakSeconds: tuple[2],
    uptimePercent30d: tuple[3],
    dailyUptime: tuple[4].map(([date, uptimePercent]) => ({ date, uptimePercent })),
  };
}

export function serializeServerHistoryPoint(sample: ServerHistoryPoint): ServerHistoryPointTuple {
  return [sample.timestamp, sample.currentStreakSeconds, sample.uptimePercent30d];
}

export function deserializeServerHistoryPoint(tuple: ServerHistoryPointTuple): ServerHistoryPoint {
  return {
    timestamp: tuple[0],
    currentStreakSeconds: tuple[1],
    uptimePercent30d: tuple[2],
  };
}
