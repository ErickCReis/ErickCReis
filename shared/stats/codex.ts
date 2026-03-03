import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const codexUsageDaySchema = v.object({
  inputTokens: nonNegativeNumber,
  cachedInputTokens: nonNegativeNumber,
  outputTokens: nonNegativeNumber,
  reasoningOutputTokens: nonNegativeNumber,
  totalTokens: nonNegativeNumber,
});
export type CodexUsageDay = v.InferOutput<typeof codexUsageDaySchema>;

export const codexUsageDailySummarySchema = v.object({
  date: v.string(),
  totalTokens: nonNegativeNumber,
});
export type CodexUsageDailySummary = v.InferOutput<typeof codexUsageDailySummarySchema>;

export const codexUsageSnapshotSchema = v.object({
  generatedAt: v.nullable(nonNegativeNumber),
  isStale: v.boolean(),
  todayTokens: nonNegativeNumber,
  totalTokens30d: nonNegativeNumber,
  daily: v.array(codexUsageDailySummarySchema),
});
export type CodexUsageSnapshot = v.InferOutput<typeof codexUsageSnapshotSchema>;

export const codexUsageSyncPayloadSchema = v.object({
  generatedAt: nonNegativeNumber,
  daily: v.array(codexUsageDaySchema),
  totals: v.optional(v.nullable(v.object({ totalTokens: nonNegativeNumber }))),
});
export type CodexUsageSyncPayload = v.InferOutput<typeof codexUsageSyncPayloadSchema>;
