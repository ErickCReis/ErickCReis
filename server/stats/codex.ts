import { rename } from "node:fs/promises";
import * as v from "valibot";
import {
  codexUsageSyncPayloadSchema,
  type CodexUsageDay,
  type CodexUsageDailySummary,
  type CodexUsageSnapshot,
  type CodexUsageSyncPayload,
} from "@shared/stats/codex";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const DEFAULT_STALE_AFTER_MINUTES = 180;
const CODEX_USAGE_REFRESH_INTERVAL_MS = 30_000;
const MAX_DAILY_POINTS = 30;
const MAX_HISTORY = 84;

type InternalStore = {
  generatedAt: number | null;
  daily: { date: string; day: CodexUsageDay }[];
};

function createEmptyStore(): InternalStore {
  return { generatedAt: null, daily: [] };
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
  return getDataPath("codex-usage.json");
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeSyncPayload(payload: CodexUsageSyncPayload): InternalStore {
  const normalizedDaily = payload.daily.slice(-MAX_DAILY_POINTS).map((entry, index) => {
    const now = new Date();
    now.setDate(now.getDate() - (payload.daily.length - 1 - index));
    return { date: formatDate(now), day: { ...entry } };
  });

  return {
    generatedAt: payload.generatedAt,
    daily: normalizedDaily,
  };
}

function buildSnapshot(store: InternalStore): CodexUsageSnapshot {
  const isStale = store.generatedAt === null || Date.now() - store.generatedAt > getStaleAfterMs();
  const dailySummaries: CodexUsageDailySummary[] = store.daily.map((e) => ({
    date: e.date,
    totalTokens: e.day.totalTokens,
  }));
  const todayTokens = store.daily.at(-1)?.day.totalTokens ?? 0;
  const totalTokens30d = store.daily.reduce((sum, e) => sum + e.day.totalTokens, 0);

  return {
    generatedAt: store.generatedAt,
    isStale,
    todayTokens,
    totalTokens30d,
    daily: dailySummaries,
  };
}

let latestStore: InternalStore = createEmptyStore();
let latestFileMtimeMs: number | null = null;
let writeQueue: Promise<void> = Promise.resolve();

let history: CodexUsageSnapshot[] = [];
let dirty = false;
let started = false;

function markDirty() {
  const snapshot = buildSnapshot(latestStore);
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
  getLatest: () => buildSnapshot(latestStore),
  getHistory: () => [...history],
  consumeLatest() {
    if (!dirty) return null;
    dirty = false;
    return buildSnapshot(latestStore);
  },
};
