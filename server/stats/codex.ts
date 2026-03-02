import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import * as v from "valibot";
import {
  codexUsageSyncPayloadSchema,
  type CodexUsageDay,
  type CodexUsageSnapshot,
  type CodexUsageSyncPayload,
  type CodexUsageTotals,
} from "@shared/stats/codex";
import type { StatModule } from "@server/stats/types";

const DEFAULT_CODEX_USAGE_FILE = "/app/runtime/codex/codex-usage.json";
const DEFAULT_STALE_AFTER_MINUTES = 180;
const CODEX_USAGE_REFRESH_INTERVAL_MS = 30_000;
const MAX_DAILY_POINTS = 30;
const MAX_HISTORY = 84;

type CodexUsageStore = Omit<CodexUsageSnapshot, "isStale">;

function createEmptyStore(): CodexUsageStore {
  return { generatedAt: null, latestDay: null, totals: null, daily: [] };
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
  if (daily.length === 0) return null;
  return daily.reduce<CodexUsageTotals>(
    (totals, day) => ({ totalTokens: totals.totalTokens + day.totalTokens }),
    { totalTokens: 0 },
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
  const isStale = store.generatedAt === null || Date.now() - store.generatedAt > getStaleAfterMs();
  return {
    generatedAt: store.generatedAt,
    isStale,
    latestDay: store.latestDay ? { ...store.latestDay } : null,
    totals: store.totals ? { ...store.totals } : null,
    daily: store.daily.map((entry) => ({ ...entry })),
  };
}

let latestStore: CodexUsageStore = createEmptyStore();
let latestFileMtimeMs: number | null = null;
let writeQueue: Promise<void> = Promise.resolve();

let history: CodexUsageSnapshot[] = [];
let dirty = false;
let started = false;

function markDirty() {
  const snapshot = withStaleStatus(latestStore);
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  dirty = true;
}

async function refreshFromDisk(force = false) {
  const filePath = getUsageFilePath();
  const file = Bun.file(filePath);

  try {
    const exists = await file.exists();
    if (!exists) throw new Error("ENOENT");

    const mtimeMs = file.lastModified;
    if (!force && latestFileMtimeMs === mtimeMs) return;

    const raw = await file.text();
    const parsed = v.safeParse(codexUsageSyncPayloadSchema, JSON.parse(raw));
    if (!parsed.success) {
      console.error("[codex] Ignoring invalid usage file payload");
      return;
    }

    latestStore = normalizeSyncPayload(parsed.output);
    latestFileMtimeMs = mtimeMs;
    markDirty();
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
        await Bun.file(tempPath)
          .delete()
          .catch(() => {});
        throw error;
      }

      latestStore = normalized;
      latestFileMtimeMs = null;
      await refreshFromDisk(true);
    });

  await writeQueue;
}

export const codexStat: StatModule<CodexUsageSnapshot> = {
  start() {
    if (started) return;
    started = true;

    void refreshFromDisk(true);
    setInterval(() => void refreshFromDisk(), CODEX_USAGE_REFRESH_INTERVAL_MS);
  },
  getLatest: () => withStaleStatus(latestStore),
  getHistory: () => [...history],
  consumeLatest() {
    if (!dirty) return null;
    dirty = false;
    return withStaleStatus(latestStore);
  },
};
