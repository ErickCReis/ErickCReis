import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));
const isoDateString = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/));

export const tokenUsageProviderIdSchema = v.pipe(v.string(), v.minLength(1));
export type TokenUsageProviderId = v.InferOutput<typeof tokenUsageProviderIdSchema>;

export const tokenUsageDaySchema = v.object({
  inputTokens: nonNegativeNumber,
  cachedInputTokens: nonNegativeNumber,
  outputTokens: nonNegativeNumber,
  reasoningOutputTokens: nonNegativeNumber,
  totalTokens: nonNegativeNumber,
});
export type TokenUsageDay = v.InferOutput<typeof tokenUsageDaySchema>;

export const tokenUsageDatedDaySchema = v.object({
  date: isoDateString,
  inputTokens: nonNegativeNumber,
  cachedInputTokens: nonNegativeNumber,
  outputTokens: nonNegativeNumber,
  reasoningOutputTokens: nonNegativeNumber,
  totalTokens: nonNegativeNumber,
});
export type TokenUsageDatedDay = v.InferOutput<typeof tokenUsageDatedDaySchema>;

export const tokenUsageDailySummarySchema = v.object({
  date: isoDateString,
  totalTokens: nonNegativeNumber,
  // Per-provider totals, aligned by index with the snapshot's `providers` list.
  byProvider: v.array(nonNegativeNumber),
});
export type TokenUsageDailySummary = v.InferOutput<typeof tokenUsageDailySummarySchema>;

export const tokenUsageSnapshotSchema = v.object({
  timestamp: nonNegativeNumber,
  generatedAt: v.nullable(nonNegativeNumber),
  isStale: v.boolean(),
  todayTokens: nonNegativeNumber,
  totalTokens30d: nonNegativeNumber,
  // Provider ids present across all sources, sorted; indexes into daily byProvider.
  providers: v.array(tokenUsageProviderIdSchema),
  daily: v.array(tokenUsageDailySummarySchema),
});
export type TokenUsageSnapshot = v.InferOutput<typeof tokenUsageSnapshotSchema>;

export const tokenUsageSyncPayloadSchema = v.object({
  sourceId: v.pipe(v.string(), v.minLength(1)),
  providerId: tokenUsageProviderIdSchema,
  generatedAt: nonNegativeNumber,
  daily: v.array(tokenUsageDatedDaySchema),
  totals: v.optional(v.nullable(v.object({ totalTokens: nonNegativeNumber }))),
});
export type TokenUsageSyncPayload = v.InferOutput<typeof tokenUsageSyncPayloadSchema>;
