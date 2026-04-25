import { afterAll, afterEach, beforeAll, describe, expect, it, setSystemTime } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CodexUsageDatedDay } from "@shared/stats/codex";
import type * as CodexStats from "@server/stats/codex";

const originalDataDir = Bun.env.DATA_DIR;
const originalStaleAfterMinutes = Bun.env.CODEX_STALE_AFTER_MINUTES;
let tempDir: string | null = null;
let codexStats!: typeof CodexStats;

function day(date: string, totalTokens: number): CodexUsageDatedDay {
  return {
    date,
    inputTokens: totalTokens,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens,
  };
}

function findDailyTotal(date: string) {
  return codexStats.codexStat.getLatest().daily.find((entry) => entry.date === date)?.totalTokens;
}

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "codex-stat-test-"));
  Bun.env.DATA_DIR = tempDir;
  codexStats = await import("@server/stats/codex");
});

afterEach(() => {
  setSystemTime();
  Bun.env.CODEX_STALE_AFTER_MINUTES = originalStaleAfterMinutes;
  codexStats.resetCodexStatForTests();
});

afterAll(async () => {
  Bun.env.DATA_DIR = originalDataDir;
  if (tempDir !== null) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("codexStat", () => {
  it("sums only the active 30-day token window", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "test-source",
      generatedAt: Date.now(),
      daily: [
        day("2026-03-26", 1_000),
        day("2026-03-27", 2_000),
        day("2026-04-25", 3_000),
        day("2026-04-26", 4_000),
      ],
      totals: { totalTokens: 10_000 },
    });

    const snapshot = codexStats.codexStat.getLatest();

    expect(snapshot.totalTokens30d).toBe(5_000);
    expect(snapshot.todayTokens).toBe(3_000);
    expect(snapshot.daily).toHaveLength(30);
    expect(snapshot.daily[0]).toEqual({ date: "2026-03-27", totalTokens: 2_000 });
    expect(snapshot.daily.at(-1)).toEqual({ date: "2026-04-25", totalTokens: 3_000 });
    expect(snapshot.daily.some((entry) => entry.date === "2026-03-26")).toBe(false);
    expect(snapshot.daily.some((entry) => entry.date === "2026-04-26")).toBe(false);
  });

  it("merges matching days from multiple sources", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "laptop",
      generatedAt: Date.now() - 1_000,
      daily: [day("2026-04-24", 100), day("2026-04-25", 200)],
      totals: { totalTokens: 300 },
    });
    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "server",
      generatedAt: Date.now(),
      daily: [day("2026-04-24", 300), day("2026-04-25", 400)],
      totals: { totalTokens: 700 },
    });

    const snapshot = codexStats.codexStat.getLatest();

    expect(findDailyTotal("2026-04-24")).toBe(400);
    expect(snapshot.todayTokens).toBe(600);
    expect(snapshot.totalTokens30d).toBe(1_000);
  });

  it("replaces an existing source instead of double-counting it", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "same-source",
      generatedAt: Date.now() - 1_000,
      daily: [day("2026-04-25", 100)],
      totals: { totalTokens: 100 },
    });
    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "same-source",
      generatedAt: Date.now(),
      daily: [day("2026-04-25", 250)],
      totals: { totalTokens: 250 },
    });

    const snapshot = codexStats.codexStat.getLatest();

    expect(snapshot.todayTokens).toBe(250);
    expect(snapshot.totalTokens30d).toBe(250);
  });

  it("keeps the last duplicate day from a source payload", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));

    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "duplicate-source",
      generatedAt: Date.now(),
      daily: [day("2026-04-25", 100), day("2026-04-25", 450)],
      totals: { totalTokens: 550 },
    });

    const snapshot = codexStats.codexStat.getLatest();

    expect(snapshot.todayTokens).toBe(450);
    expect(snapshot.totalTokens30d).toBe(450);
  });

  it("marks snapshots stale after the configured freshness window", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));
    Bun.env.CODEX_STALE_AFTER_MINUTES = "10";

    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "stale-source",
      generatedAt: Date.now() - 11 * 60_000,
      daily: [day("2026-04-25", 100)],
      totals: { totalTokens: 100 },
    });

    expect(codexStats.codexStat.getLatest().isStale).toBe(true);
  });

  it("accepts fresh snapshots within the configured freshness window", async () => {
    setSystemTime(new Date("2026-04-25T15:00:00.000Z"));
    Bun.env.CODEX_STALE_AFTER_MINUTES = "10";

    await codexStats.persistCodexUsageSyncPayload({
      sourceId: "fresh-source",
      generatedAt: Date.now() - 9 * 60_000,
      daily: [day("2026-04-25", 100)],
      totals: { totalTokens: 100 },
    });

    expect(codexStats.codexStat.getLatest().isStale).toBe(false);
  });
});
