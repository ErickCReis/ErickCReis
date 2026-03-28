import type { CodexUsageSnapshot } from "@shared/stats/codex";

export type CodexHistoryPoint = Pick<
  CodexUsageSnapshot,
  "timestamp" | "generatedAt" | "isStale" | "todayTokens" | "totalTokens30d"
>;

export type CodexUsageSnapshotTuple = [
  number,
  number | null,
  boolean,
  number,
  number,
  Array<[string, number]>,
];

export type CodexHistoryPointTuple = [number, number | null, boolean, number, number];

export function serializeCodexUsageSnapshot(sample: CodexUsageSnapshot): CodexUsageSnapshotTuple {
  return [
    sample.timestamp,
    sample.generatedAt,
    sample.isStale,
    sample.todayTokens,
    sample.totalTokens30d,
    sample.daily.map((day) => [day.date, day.totalTokens]),
  ];
}

export function deserializeCodexUsageSnapshot(tuple: CodexUsageSnapshotTuple): CodexUsageSnapshot {
  return {
    timestamp: tuple[0],
    generatedAt: tuple[1],
    isStale: tuple[2],
    todayTokens: tuple[3],
    totalTokens30d: tuple[4],
    daily: tuple[5].map(([date, totalTokens]) => ({ date, totalTokens })),
  };
}

export function serializeCodexHistoryPoint(sample: CodexHistoryPoint): CodexHistoryPointTuple {
  return [
    sample.timestamp,
    sample.generatedAt,
    sample.isStale,
    sample.todayTokens,
    sample.totalTokens30d,
  ];
}

export function deserializeCodexHistoryPoint(tuple: CodexHistoryPointTuple): CodexHistoryPoint {
  return {
    timestamp: tuple[0],
    generatedAt: tuple[1],
    isStale: tuple[2],
    todayTokens: tuple[3],
    totalTokens30d: tuple[4],
  };
}
