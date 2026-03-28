import type { SystemStat } from "@shared/stats/system";

export type SystemHistoryPoint = Pick<
  SystemStat,
  "timestamp" | "cpuUsagePercent" | "systemMemoryUsedPercent"
>;

export type SystemStatTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number | null,
  SystemStat["batteryStatus"],
];

export type SystemHistoryPointTuple = [number, number, number];

export function serializeSystemStat(sample: SystemStat): SystemStatTuple {
  return [
    sample.timestamp,
    sample.cpuUsagePercent,
    sample.memoryUsedMb,
    sample.totalMemoryMb,
    sample.cpuCount,
    sample.systemMemoryUsedPercent,
    sample.batteryPercent,
    sample.batteryStatus,
  ];
}

export function deserializeSystemStat(tuple: SystemStatTuple): SystemStat {
  return {
    timestamp: tuple[0],
    cpuUsagePercent: tuple[1],
    memoryUsedMb: tuple[2],
    totalMemoryMb: tuple[3],
    cpuCount: tuple[4],
    systemMemoryUsedPercent: tuple[5],
    batteryPercent: tuple[6],
    batteryStatus: tuple[7],
  };
}

export function serializeSystemHistoryPoint(sample: SystemHistoryPoint): SystemHistoryPointTuple {
  return [sample.timestamp, sample.cpuUsagePercent, sample.systemMemoryUsedPercent];
}

export function deserializeSystemHistoryPoint(tuple: SystemHistoryPointTuple): SystemHistoryPoint {
  return {
    timestamp: tuple[0],
    cpuUsagePercent: tuple[1],
    systemMemoryUsedPercent: tuple[2],
  };
}
