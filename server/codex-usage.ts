import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import * as v from "valibot";
import {
  codexUsageDaySchema,
  codexUsageDailySummarySchema,
  codexUsageSnapshotSchema,
  codexUsageSyncPayloadSchema,
  codexUsageTotalsSchema,
  type CodexUsageDay,
  type CodexUsageDailySummary,
  type CodexUsageSnapshot,
  type CodexUsageSyncPayload,
  type CodexUsageTotals,
} from "@shared/telemetry";

const DEFAULT_CODEX_USAGE_FILE = "/app/runtime/codex/codex-usage.json";
const DEFAULT_STALE_AFTER_MINUTES = 180;
const CODEX_USAGE_REFRESH_INTERVAL_MS = 30_000;
const MAX_DAILY_POINTS = 30;

export {
  codexUsageDaySchema,
  codexUsageDailySummarySchema,
  codexUsageSnapshotSchema,
  codexUsageSyncPayloadSchema,
  codexUsageTotalsSchema,
};
export type {
  CodexUsageDay,
  CodexUsageDailySummary,
  CodexUsageSnapshot,
  CodexUsageSyncPayload,
  CodexUsageTotals,
};

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
      totalTokens: totals.totalTokens + day.totalTokens,
    }),
    {
      totalTokens: 0,
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
    daily: normalizedDaily.map(({ totalTokens }) => ({ totalTokens })),
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
  const file = Bun.file(filePath);

  try {
    const exists = await file.exists();
    if (!exists) {
      throw new Error("ENOENT");
    }

    const mtimeMs = await file.lastModified;
    if (!force && latestFileMtimeMs === mtimeMs) {
      return;
    }

    const raw = await file.text();
    const parsed = v.safeParse(codexUsageSyncPayloadSchema, JSON.parse(raw));
    if (!parsed.success) {
      console.error("[codex] Ignoring invalid usage file payload");
      return;
    }

    latestStore = normalizeSyncPayload(parsed.output);
    latestFileMtimeMs = mtimeMs;
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

  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const tempPath = `${filePath}.${Math.random().toString(36).slice(2)}.${Date.now()}.tmp`;
      await mkdir(dirname(filePath), { recursive: true });

      try {
        await Bun.write(tempPath, `${JSON.stringify(payload, null, 2)}\n`);
        await rename(tempPath, filePath);
      } catch (error) {
        await Bun.file(tempPath).delete().catch(() => {});
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
