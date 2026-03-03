import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const uptimeDaySummarySchema = v.object({
  date: v.string(),
  uptimePercent: v.number(),
});
export type UptimeDaySummary = v.InferOutput<typeof uptimeDaySummarySchema>;

export const serverInfoStatSchema = v.object({
  timestamp: nonNegativeNumber,
  appVersion: v.string(),
  currentStreakSeconds: nonNegativeNumber,
  uptimePercent30d: v.number(),
  dailyUptime: v.array(uptimeDaySummarySchema),
});
export type ServerInfoStat = v.InferOutput<typeof serverInfoStatSchema>;
