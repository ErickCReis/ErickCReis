import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import * as v from "valibot";

const DEFAULT_CODEX_USAGE_FILE = "/app/runtime/codex/codex-usage.json";
const DEFAULT_STALE_AFTER_MINUTES = 180;
const CODEX_USAGE_REFRESH_INTERVAL_MS = 30_000;
const MAX_DAILY_POINTS = 30;

const tokenValueSchema = v.pipe(v.number(), v.minValue(0));
const costValueSchema = v.pipe(v.number(), v.minValue(0));

const codexUsageTotalsShape = {
  inputTokens: tokenValueSchema,
  cachedInputTokens: tokenValueSchema,
  outputTokens: tokenValueSchema,
  reasoningOutputTokens: tokenValueSchema,
  totalTokens: tokenValueSchema,
  costUSD: costValueSchema,
};

export const codexUsageTotalsSchema = v.object(codexUsageTotalsShape);
export type CodexUsageTotals = v.InferOutput<typeof codexUsageTotalsSchema>;

export const codexUsageDaySchema = v.object({
  dateLabel: v.string(),
  ...codexUsageTotalsShape,
});
export type CodexUsageDay = v.InferOutput<typeof codexUsageDaySchema>;

export const codexUsageDailySummarySchema = v.object({
  dateLabel: v.string(),
  totalTokens: tokenValueSchema,
  costUSD: costValueSchema,
});
export type CodexUsageDailySummary = v.InferOutput<typeof codexUsageDailySummarySchema>;

export const codexUsageSnapshotSchema = v.object({
  generatedAt: v.nullable(v.number()),
  isStale: v.boolean(),
  latestDay: v.nullable(codexUsageDaySchema),
  totals: v.nullable(codexUsageTotalsSchema),
  daily: v.array(codexUsageDailySummarySchema),
});
export type CodexUsageSnapshot = v.InferOutput<typeof codexUsageSnapshotSchema>;

export const codexUsageSyncPayloadSchema = v.object({
  generatedAt: v.pipe(v.number(), v.minValue(0)),
  daily: v.array(codexUsageDaySchema),
  totals: v.optional(v.nullable(codexUsageTotalsSchema)),
});
export type CodexUsageSyncPayload = v.InferOutput<typeof codexUsageSyncPayloadSchema>;

type CodexUsageStore = Omit<CodexUsageSnapshot, "isStale">;

function cloneTotals(totals: CodexUsageTotals | null): CodexUsageTotals | null {
  return totals ? { ...totals } : null;
}

function cloneDay(day: CodexUsageDay | null): CodexUsageDay | null {
  return day ? { ...day } : null;
}

function cloneDailySummary(daily: CodexUsageDailySummary[]) {
  return daily.map((entry) => ({ ...entry }));
}

function createEmptyStore(): CodexUsageStore {
  return {
    generatedAt: null,
    latestDay: null,
    totals: null,
    daily: [],
  };
}

function getStaleAfterMs() {
  const configuredMinutes = Number.parseFloat(Bun.env.CODEX_STALE_AFTER_MINUTES ?? "");
  const minutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0
      ? configuredMinutes
      : DEFAULT_STALE_AFTER_MINUTES;
  return Math.floor(minutes * 60_000);
}

function getUsageFilePath() {
  return Bun.env.CODEX_USAGE_FILE?.trim() || DEFAULT_CODEX_USAGE_FILE;
}

function computeTotals(daily: CodexUsageDay[]): CodexUsageTotals | null {
  if (daily.length === 0) {
    return null;
  }

  return daily.reduce<CodexUsageTotals>(
    (totals, day) => ({
      inputTokens: totals.inputTokens + day.inputTokens,
      cachedInputTokens: totals.cachedInputTokens + day.cachedInputTokens,
      outputTokens: totals.outputTokens + day.outputTokens,
      reasoningOutputTokens: totals.reasoningOutputTokens + day.reasoningOutputTokens,
      totalTokens: totals.totalTokens + day.totalTokens,
      costUSD: totals.costUSD + day.costUSD,
    }),
    {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      totalTokens: 0,
      costUSD: 0,
    },
  );
}

function normalizeSyncPayload(payload: CodexUsageSyncPayload): CodexUsageStore {
  const normalizedDaily = payload.daily.slice(-MAX_DAILY_POINTS).map((entry) => ({ ...entry }));
  const latestDay = normalizedDaily.at(-1) ?? null;
  const totals = payload.totals ?? computeTotals(normalizedDaily);

  return {
    generatedAt: payload.generatedAt,
    latestDay,
    totals: totals ? { ...totals } : null,
    daily: normalizedDaily.map(({ dateLabel, totalTokens, costUSD }) => ({
      dateLabel,
      totalTokens,
      costUSD,
    })),
  };
}

function withStaleStatus(store: CodexUsageStore): CodexUsageSnapshot {
  const generatedAt = store.generatedAt;
  const isStale = generatedAt === null || Date.now() - generatedAt > getStaleAfterMs();

  return {
    generatedAt,
    isStale,
    latestDay: cloneDay(store.latestDay),
    totals: cloneTotals(store.totals),
    daily: cloneDailySummary(store.daily),
  };
}

let latestStore: CodexUsageStore = createEmptyStore();
let latestFileMtimeMs: number | null = null;
let readInterval: ReturnType<typeof setInterval> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

async function refreshFromDisk(force = false) {
  const filePath = getUsageFilePath();

  try {
    const fileStats = await stat(filePath);
    if (!force && latestFileMtimeMs === fileStats.mtimeMs) {
      return;
    }

    const raw = await readFile(filePath, "utf-8");
    const parsed = v.safeParse(codexUsageSyncPayloadSchema, JSON.parse(raw) as unknown);
    if (!parsed.success) {
      console.error("[codex] Ignoring invalid usage file payload");
      return;
    }

    latestStore = normalizeSyncPayload(parsed.output);
    latestFileMtimeMs = fileStats.mtimeMs;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      latestStore = createEmptyStore();
      latestFileMtimeMs = null;
      return;
    }

    console.error("[codex] Failed to refresh usage file", error);
  }
}

export function parseCodexUsageSyncPayload(input: unknown) {
  return v.safeParse(codexUsageSyncPayloadSchema, input);
}

export async function persistCodexUsageSyncPayload(payload: CodexUsageSyncPayload) {
  const normalized = normalizeSyncPayload(payload);
  const filePath = getUsageFilePath();

  writeQueue = writeQueue.catch(() => {}).then(async () => {
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(dirname(filePath), { recursive: true });

    try {
      await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
      await rename(tempPath, filePath);
    } catch (error) {
      await unlink(tempPath).catch(() => {});
      throw error;
    }

    latestStore = normalized;
    latestFileMtimeMs = null;
    await refreshFromDisk(true);
  });

  await writeQueue;
}

export function startCodexUsageStore() {
  if (readInterval) {
    return;
  }

  void refreshFromDisk(true);
  readInterval = setInterval(() => {
    void refreshFromDisk();
  }, CODEX_USAGE_REFRESH_INTERVAL_MS);
}

export function getLatestCodexUsageSnapshot(): CodexUsageSnapshot {
  return withStaleStatus(latestStore);
}
