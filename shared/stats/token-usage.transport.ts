import type { TokenUsageSnapshot } from "@shared/stats/token-usage";

export type TokenUsageHistoryPoint = Pick<
  TokenUsageSnapshot,
  "timestamp" | "generatedAt" | "isStale" | "todayTokens" | "totalTokens30d"
>;

export type TokenUsageSnapshotTuple = [
  number,
  number | null,
  boolean,
  number,
  number,
  Array<[string, number]>,
];

export type TokenUsageHistoryPointTuple = [number, number | null, boolean, number, number];

export function serializeTokenUsageSnapshot(sample: TokenUsageSnapshot): TokenUsageSnapshotTuple {
  return [
    sample.timestamp,
    sample.generatedAt,
    sample.isStale,
    sample.todayTokens,
    sample.totalTokens30d,
    sample.daily.map((day) => [day.date, day.totalTokens]),
  ];
}

export function deserializeTokenUsageSnapshot(tuple: TokenUsageSnapshotTuple): TokenUsageSnapshot {
  return {
    timestamp: tuple[0],
    generatedAt: tuple[1],
    isStale: tuple[2],
    todayTokens: tuple[3],
    totalTokens30d: tuple[4],
    daily: tuple[5].map(([date, totalTokens]) => ({ date, totalTokens })),
  };
}

export function serializeTokenUsageHistoryPoint(
  sample: TokenUsageHistoryPoint,
): TokenUsageHistoryPointTuple {
  return [
    sample.timestamp,
    sample.generatedAt,
    sample.isStale,
    sample.todayTokens,
    sample.totalTokens30d,
  ];
}

export function deserializeTokenUsageHistoryPoint(
  tuple: TokenUsageHistoryPointTuple,
): TokenUsageHistoryPoint {
  return {
    timestamp: tuple[0],
    generatedAt: tuple[1],
    isStale: tuple[2],
    todayTokens: tuple[3],
    totalTokens30d: tuple[4],
  };
}
