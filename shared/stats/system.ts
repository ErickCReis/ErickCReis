import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const systemStatSchema = v.object({
  timestamp: nonNegativeNumber,
  cpuUsagePercent: v.number(),
  memoryHeapUsedMb: nonNegativeNumber,
  systemMemoryUsedPercent: v.number(),
});
export type SystemStat = v.InferOutput<typeof systemStatSchema>;
