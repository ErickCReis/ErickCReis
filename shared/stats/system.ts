import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));
const percentNumber = v.pipe(v.number(), v.minValue(0), v.maxValue(100));
const positiveInteger = v.pipe(v.number(), v.integer(), v.minValue(1));
const batteryStatus = v.picklist(["charging", "discharging", "full", "unknown"]);

export const systemStatSchema = v.object({
  timestamp: nonNegativeNumber,
  cpuUsagePercent: percentNumber,
  memoryUsedMb: nonNegativeNumber,
  totalMemoryMb: nonNegativeNumber,
  cpuCount: positiveInteger,
  systemMemoryUsedPercent: percentNumber,
  batteryPercent: v.nullable(percentNumber),
  batteryStatus: v.nullable(batteryStatus),
});
export type SystemStat = v.InferOutput<typeof systemStatSchema>;
