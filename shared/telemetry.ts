import * as v from "valibot";

const nonNegativeNumberSchema = v.pipe(v.number(), v.minValue(0));

export const cursorPayloadSchema = v.object({
  id: v.string(),
  x: v.number(),
  y: v.number(),
  color: v.optional(v.string()),
});
export type CursorPayload = v.InferOutput<typeof cursorPayloadSchema>;

export const codexUsageTotalsSchema = v.object({
  totalTokens: nonNegativeNumberSchema,
});
export type CodexUsageTotals = v.InferOutput<typeof codexUsageTotalsSchema>;

export const codexUsageDaySchema = v.object({
  inputTokens: nonNegativeNumberSchema,
  cachedInputTokens: nonNegativeNumberSchema,
  outputTokens: nonNegativeNumberSchema,
  reasoningOutputTokens: nonNegativeNumberSchema,
  totalTokens: nonNegativeNumberSchema,
});
export type CodexUsageDay = v.InferOutput<typeof codexUsageDaySchema>;

export const codexUsageDailySummarySchema = v.object({
  totalTokens: nonNegativeNumberSchema,
});
export type CodexUsageDailySummary = v.InferOutput<typeof codexUsageDailySummarySchema>;

export const codexUsageSnapshotSchema = v.object({
  generatedAt: v.nullable(nonNegativeNumberSchema),
  isStale: v.boolean(),
  latestDay: v.nullable(codexUsageDaySchema),
  totals: v.nullable(codexUsageTotalsSchema),
  daily: v.array(codexUsageDailySummarySchema),
});
export type CodexUsageSnapshot = v.InferOutput<typeof codexUsageSnapshotSchema>;

export const codexUsageSyncPayloadSchema = v.object({
  generatedAt: nonNegativeNumberSchema,
  daily: v.array(codexUsageDaySchema),
  totals: v.optional(v.nullable(codexUsageTotalsSchema)),
});
export type CodexUsageSyncPayload = v.InferOutput<typeof codexUsageSyncPayloadSchema>;

export const spotifyNowPlayingSchema = v.object({
  isConfigured: v.boolean(),
  isPlaying: v.boolean(),
  trackId: v.nullable(v.string()),
  trackName: v.nullable(v.string()),
  artistNames: v.array(v.string()),
  albumName: v.nullable(v.string()),
  trackUrl: v.nullable(v.string()),
  progressMs: nonNegativeNumberSchema,
  durationMs: nonNegativeNumberSchema,
  fetchedAt: nonNegativeNumberSchema,
});
export type SpotifyNowPlaying = v.InferOutput<typeof spotifyNowPlayingSchema>;

export const gitHubCommitStatsSchema = v.object({
  isConfigured: v.boolean(),
  username: v.string(),
  year: v.number(),
  commitsYearToDate: nonNegativeNumberSchema,
  commitsLast7Days: v.array(nonNegativeNumberSchema),
  commitsLast7DayLabels: v.array(v.string()),
  fetchedAt: nonNegativeNumberSchema,
});
export type GitHubCommitStats = v.InferOutput<typeof gitHubCommitStatsSchema>;

export const serverStatsSchema = v.object({
  timestamp: nonNegativeNumberSchema,
  appVersion: v.string(),
  uptimeSeconds: nonNegativeNumberSchema,
  memoryHeapUsedMb: nonNegativeNumberSchema,
  systemMemoryUsedPercent: v.number(),
  cpuUsagePercent: v.number(),
  pendingWebSockets: nonNegativeNumberSchema,
  cursorSubscribers: nonNegativeNumberSchema,
  spotify: spotifyNowPlayingSchema,
  github: gitHubCommitStatsSchema,
  codex: codexUsageSnapshotSchema,
});
export type ServerStats = v.InferOutput<typeof serverStatsSchema>;

export const serverStatsHistorySchema = v.array(serverStatsSchema);
