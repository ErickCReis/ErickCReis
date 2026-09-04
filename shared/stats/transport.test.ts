import { describe, expect, it } from "bun:test";
import { deserializeStatsStreamEvent, serializeStatsStreamEvent } from "@shared/stats/transport";

type StatsStreamEvent = Parameters<typeof serializeStatsStreamEvent>[0];

const events: StatsStreamEvent[] = [
  {
    name: "system",
    data: {
      timestamp: 1,
      cpuUsagePercent: 2,
      memoryUsedMb: 3,
      totalMemoryMb: 4,
      cpuCount: 5,
      systemMemoryUsedPercent: 6,
      batteryPercent: 7,
      batteryStatus: "charging",
    },
  },
  {
    name: "server",
    data: {
      timestamp: 1,
      appVersion: "0.1.0",
      currentStreakSeconds: 2,
      uptimePercent30d: 99,
      dailyUptime: [{ date: "2026-09-04", uptimePercent: 100 }],
    },
  },
  {
    name: "websocket",
    data: {
      timestamp: 1,
      connectedUsers: 2,
      maxConcurrentUsers: 3,
      connectionStartedAt: 4,
    },
  },
  {
    name: "spotify",
    data: {
      isConfigured: true,
      isPlaying: true,
      trackId: "track-id",
      trackName: "Track",
      artistNames: ["Artist"],
      albumName: "Album",
      trackUrl: "https://open.spotify.com/track/track-id",
      progressMs: 1,
      durationMs: 2,
      fetchedAt: 3,
    },
  },
  {
    name: "github",
    data: {
      isConfigured: true,
      username: "ErickCReis",
      lastCommitDate: "2026-09-04",
      commitsToday: 1,
      commitsLast30Days: [1, 2],
      commitsLast30DayLabels: ["03", "04"],
      commitsThisMonth: 3,
      commitsThisYear: 4,
      fetchedAt: 5,
    },
  },
  {
    name: "tokenUsage",
    data: {
      timestamp: 1,
      generatedAt: 2,
      isStale: false,
      todayTokens: 3,
      totalTokens30d: 4,
      providers: ["codex"],
      daily: [{ date: "2026-09-04", totalTokens: 4, byProvider: [4] }],
    },
  },
];

describe("stats stream transport", () => {
  it("round-trips every event without type assertions", () => {
    for (const event of events) {
      const encoded = serializeStatsStreamEvent(event);
      expect(deserializeStatsStreamEvent(encoded)).toEqual(event);
    }
  });

  it("rejects a malformed payload instead of trusting its type", () => {
    expect(() => deserializeStatsStreamEvent({ e: "sy", d: [] })).toThrow();
  });
});
