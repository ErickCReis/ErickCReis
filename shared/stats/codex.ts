import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const codexUsageTotalsSchema = v.object({
  totalTokens: nonNegativeNumber,
});
export type CodexUsageTotals = v.InferOutput<typeof codexUsageTotalsSchema>;

export const codexUsageDaySchema = v.object({
  inputTokens: nonNegativeNumber,
  cachedInputTokens: nonNegativeNumber,
  outputTokens: nonNegativeNumber,
  reasoningOutputTokens: nonNegativeNumber,
  totalTokens: nonNegativeNumber,
});
export type CodexUsageDay = v.InferOutput<typeof codexUsageDaySchema>;

export const codexUsageDailySummarySchema = v.object({
  totalTokens: nonNegativeNumber,
});
export type CodexUsageDailySummary = v.InferOutput<typeof codexUsageDailySummarySchema>;

export const codexUsageSnapshotSchema = v.object({
  generatedAt: v.nullable(nonNegativeNumber),
  isStale: v.boolean(),
  latestDay: v.nullable(codexUsageDaySchema),
  totals: v.nullable(codexUsageTotalsSchema),
  daily: v.array(codexUsageDailySummarySchema),
});
export type CodexUsageSnapshot = v.InferOutput<typeof codexUsageSnapshotSchema>;

export const codexUsageSyncPayloadSchema = v.object({
  generatedAt: nonNegativeNumber,
  daily: v.array(codexUsageDaySchema),
  totals: v.optional(v.nullable(codexUsageTotalsSchema)),
});
export type CodexUsageSyncPayload = v.InferOutput<typeof codexUsageSyncPayloadSchema>;
