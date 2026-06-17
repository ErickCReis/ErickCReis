import { afterAll, afterEach, beforeAll, describe, expect, it, setSystemTime } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TokenUsageDatedDay } from "@shared/stats/token-usage";
import type * as TokenUsageStats from "@server/stats/token-usage";

const originalDataDir = Bun.env.DATA_DIR;
const originalStaleAfterMinutes = Bun.env.TOKEN_USAGE_STALE_AFTER_MINUTES;
let tempDir: string | null = null;
let tokenUsageStats!: typeof TokenUsageStats;

function day(date: string, totalTokens: number): TokenUsageDatedDay {
  return {
    date,
    inputTokens: totalTokens,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens,
  };
}

function payload(sourceId: string, generatedAt: number, daily: TokenUsageDatedDay[]) {
  return {
    sourceId,
    providerId: sourceId.split("-")[0] || "test",
    generatedAt,
    daily,
    totals: { totalTokens: daily.reduce((sum, entry) => sum + entry.totalTokens, 0) },
  };
}

function findDailyTotal(date: string) {
  return tokenUsageStats.tokenUsageStat.getLatest().daily.find((entry) => entry.date === date)
    ?.totalTokens;
}

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "token-usage-stat-test-"));
  Bun.env.DATA_DIR = tempDir;
  tokenUsageStats = await import("@server/stats/token-usage");
});

afterEach(() => {
  setSystemTime();
  Bun.env.TOKEN_USAGE_STALE_AFTER_MINUTES = originalStaleAfterMinutes;
  tokenUsageStats.resetTokenUsageStatForTests();
});

afterAll(async () => {
  Bun.env.DATA_DIR = originalDataDir;
  if (tempDir !== null) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("tokenUsageStat", () => {
  it("sums only the active 30-day token window", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("test-source", Date.now(), [
        day("2026-03-26", 1_000),
        day("2026-03-27", 2_000),
        day("2026-04-25", 3_000),
        day("2026-04-26", 4_000),
      ]),
    );

    const snapshot = tokenUsageStats.tokenUsageStat.getLatest();

    expect(snapshot.totalTokens30d).toBe(5_000);
    expect(snapshot.todayTokens).toBe(3_000);
    expect(snapshot.daily).toHaveLength(30);
    expect(snapshot.providers).toEqual(["test"]);
    expect(snapshot.daily[0]).toEqual({
      date: "2026-03-27",
      totalTokens: 2_000,
      byProvider: [2_000],
    });
    expect(snapshot.daily.at(-1)).toEqual({
      date: "2026-04-25",
      totalTokens: 3_000,
      byProvider: [3_000],
    });
    expect(snapshot.daily.some((entry) => entry.date === "2026-03-26")).toBe(false);
    expect(snapshot.daily.some((entry) => entry.date === "2026-04-26")).toBe(false);
  });

  it("merges matching days from multiple sources", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("laptop", Date.now() - 1_000, [day("2026-04-24", 100), day("2026-04-25", 200)]),
    );
    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("server", Date.now(), [day("2026-04-24", 300), day("2026-04-25", 400)]),
    );

    const snapshot = tokenUsageStats.tokenUsageStat.getLatest();

    expect(findDailyTotal("2026-04-24")).toBe(400);
    expect(snapshot.todayTokens).toBe(600);
    expect(snapshot.totalTokens30d).toBe(1_000);
  });

  it("breaks down daily totals by provider, sorted and index-aligned", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("codex-laptop", Date.now() - 1_000, [day("2026-04-25", 200)]),
    );
    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("claude-laptop", Date.now(), [day("2026-04-25", 500)]),
    );

    const snapshot = tokenUsageStats.tokenUsageStat.getLatest();
    const today = snapshot.daily.at(-1);

    expect(snapshot.providers).toEqual(["claude", "codex"]);
    expect(today?.totalTokens).toBe(700);
    expect(today?.byProvider).toEqual([500, 200]);
  });

  it("replaces an existing source instead of double-counting it", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("same-source", Date.now() - 1_000, [day("2026-04-25", 100)]),
    );
    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("same-source", Date.now(), [day("2026-04-25", 250)]),
    );

    const snapshot = tokenUsageStats.tokenUsageStat.getLatest();

    expect(snapshot.todayTokens).toBe(250);
    expect(snapshot.totalTokens30d).toBe(250);
  });

  it("keeps the last duplicate day from a source payload", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("duplicate-source", Date.now(), [day("2026-04-25", 100), day("2026-04-25", 450)]),
    );

    const snapshot = tokenUsageStats.tokenUsageStat.getLatest();

    expect(snapshot.todayTokens).toBe(450);
    expect(snapshot.totalTokens30d).toBe(450);
  });

  it("marks snapshots stale after the configured freshness window", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));
    Bun.env.TOKEN_USAGE_STALE_AFTER_MINUTES = "10";

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("stale-source", Date.now() - 11 * 60_000, [day("2026-04-25", 100)]),
    );

    expect(tokenUsageStats.tokenUsageStat.getLatest().isStale).toBe(true);
  });

  it("accepts fresh snapshots within the configured freshness window", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));
    Bun.env.TOKEN_USAGE_STALE_AFTER_MINUTES = "10";

    await tokenUsageStats.persistTokenUsageSyncPayload(
      payload("fresh-source", Date.now() - 9 * 60_000, [day("2026-04-25", 100)]),
    );

    expect(tokenUsageStats.tokenUsageStat.getLatest().isStale).toBe(false);
  });
});
