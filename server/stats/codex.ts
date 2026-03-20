import { rename } from "node:fs/promises";
import * as v from "valibot";
import {
  codexUsageDatedDaySchema,
  codexUsageSyncPayloadSchema,
  type CodexUsageDay,
  type CodexUsageDatedDay,
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
const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

const persistedSourceSchema = v.object({
  sourceId: v.pipe(v.string(), v.minLength(1)),
  generatedAt: nonNegativeNumber,
  daily: v.array(codexUsageDatedDaySchema),
});

const persistedStoreSchema = v.object({
  version: v.literal(2),
  sources: v.array(persistedSourceSchema),
});

type InternalSourceStore = {
  sourceId: string;
  generatedAt: number;
  daily: { date: string; day: CodexUsageDay }[];
};

type InternalStore = { sources: InternalSourceStore[] };

function createEmptyStore(): InternalStore {
  return { sources: [] };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function createDay(day: CodexUsageDay): CodexUsageDay {
  return {
    inputTokens: day.inputTokens,
    cachedInputTokens: day.cachedInputTokens,
    outputTokens: day.outputTokens,
    reasoningOutputTokens: day.reasoningOutputTokens,
    totalTokens: day.totalTokens,
  };
}

function createEmptyDay(): CodexUsageDay {
  return createDay({
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  });
}

function addDayUsage(target: CodexUsageDay, source: CodexUsageDay) {
  target.inputTokens += source.inputTokens;
  target.cachedInputTokens += source.cachedInputTokens;
  target.outputTokens += source.outputTokens;
  target.reasoningOutputTokens += source.reasoningOutputTokens;
  target.totalTokens += source.totalTokens;
}

function normalizeDailyEntries(entries: CodexUsageDatedDay[]) {
  const byDate = new Map<string, CodexUsageDay>();

  for (const entry of entries) {
    byDate.set(entry.date, createDay(entry));
  }

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-MAX_DAILY_POINTS)
    .map(([date, day]) => ({ date, day }));
}

function normalizeSourcePayload(payload: CodexUsageSyncPayload): InternalSourceStore {
  return {
    sourceId: payload.sourceId,
    generatedAt: payload.generatedAt,
    daily: normalizeDailyEntries(payload.daily),
  };
}

function buildMergedDaily(store: InternalStore) {
  const byDate = new Map<string, CodexUsageDay>();

  for (const source of store.sources) {
    for (const entry of source.daily) {
      const existing = byDate.get(entry.date) ?? createEmptyDay();
      if (!byDate.has(entry.date)) {
        byDate.set(entry.date, existing);
      }
      addDayUsage(existing, entry.day);
    }
  }

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-MAX_DAILY_POINTS)
    .map(([date, day]) => ({ date, day }));
}

function buildWindowedDaily(store: InternalStore) {
  const byDate = new Map(buildMergedDaily(store).map((entry) => [entry.date, entry.day]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: MAX_DAILY_POINTS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (MAX_DAILY_POINTS - index - 1));
    return {
      date: formatDate(date),
      day: createDay(byDate.get(formatDate(date)) ?? createEmptyDay()),
    };
  });
}

function getLatestGeneratedAt(store: InternalStore) {
  return store.sources.reduce<number | null>(
    (latest, source) =>
      latest == null || source.generatedAt > latest ? source.generatedAt : latest,
    null,
  );
}

function buildSnapshot(store: InternalStore): CodexUsageSnapshot {
  const generatedAt = getLatestGeneratedAt(store);
  const mergedDaily = generatedAt === null ? [] : buildWindowedDaily(store);
  const isStale = generatedAt === null || Date.now() - generatedAt > getStaleAfterMs();
  const dailySummaries: CodexUsageDailySummary[] = mergedDaily.map((e) => ({
    date: e.date,
    totalTokens: e.day.totalTokens,
  }));
  const todayTokens = mergedDaily.at(-1)?.day.totalTokens ?? 0;
  const totalTokens30d = mergedDaily.reduce((sum, e) => sum + e.day.totalTokens, 0);

  return {
    timestamp: Date.now(),
    generatedAt,
    isStale,
    todayTokens,
    totalTokens30d,
    daily: dailySummaries,
  };
}

let latestStore: InternalStore = createEmptyStore();
let latestSnapshot: CodexUsageSnapshot | null = null;
let latestFileMtimeMs: number | null = null;
let writeQueue: Promise<void> = Promise.resolve();

let history: CodexUsageSnapshot[] = [];
let version = 0;
let started = false;

function areSnapshotsEqual(current: CodexUsageSnapshot, next: CodexUsageSnapshot) {
  if (current.generatedAt !== next.generatedAt) return false;
  if (current.isStale !== next.isStale) return false;
  if (current.todayTokens !== next.todayTokens) return false;
  if (current.totalTokens30d !== next.totalTokens30d) return false;
  if (current.daily.length !== next.daily.length) return false;

  for (let index = 0; index < current.daily.length; index += 1) {
    const currentEntry = current.daily[index];
    const nextEntry = next.daily[index];
    if (currentEntry?.date !== nextEntry?.date) return false;
    if (currentEntry?.totalTokens !== nextEntry?.totalTokens) return false;
  }

  return true;
}

function markDirty(snapshot = buildSnapshot(latestStore)) {
  latestSnapshot = snapshot;
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  version++;
}

function refreshDerivedSnapshot() {
  const snapshot = buildSnapshot(latestStore);
  if (snapshot.generatedAt === null && latestSnapshot === null) return;
  if (latestSnapshot && areSnapshotsEqual(latestSnapshot, snapshot)) return;
  markDirty(snapshot);
}

async function refreshFromDisk(force = false) {
  const filePath = getUsageFilePath();
  const file = Bun.file(filePath);

  try {
    const exists = await file.exists();
    if (!exists) {
      const err = new Error("ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }

    const mtimeMs = file.lastModified;
    if (!force && latestFileMtimeMs === mtimeMs) {
      refreshDerivedSnapshot();
      return;
    }

    const raw = await file.text();
    const parsedJson = JSON.parse(raw);

    const persistedStore = v.safeParse(persistedStoreSchema, parsedJson);
    if (persistedStore.success) {
      latestStore = {
        sources: persistedStore.output.sources.map((source) => ({
          sourceId: source.sourceId,
          generatedAt: source.generatedAt,
          daily: normalizeDailyEntries(source.daily),
        })),
      };
      latestFileMtimeMs = mtimeMs;
      refreshDerivedSnapshot();
      return;
    }

    console.error("[codex] Ignoring invalid usage file payload");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      latestStore = createEmptyStore();
      latestFileMtimeMs = null;
      refreshDerivedSnapshot();
      return;
    }
    console.error("[codex] Failed to refresh usage file", error);
  }
}

export function parseCodexUsageSyncPayload(input: unknown) {
  return v.safeParse(codexUsageSyncPayloadSchema, input);
}

export async function persistCodexUsageSyncPayload(payload: CodexUsageSyncPayload) {
  const normalizedSource = normalizeSourcePayload(payload);
  const normalized: InternalStore = {
    sources: [
      ...latestStore.sources.filter((source) => source.sourceId !== normalizedSource.sourceId),
      normalizedSource,
    ].sort((sourceA, sourceB) => sourceA.sourceId.localeCompare(sourceB.sourceId)),
  };
  const filePath = getUsageFilePath();

  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const tempPath = `${filePath}.${Math.random().toString(36).slice(2)}.${Date.now()}.tmp`;
      const serialized = {
        version: 2 as const,
        sources: normalized.sources.map((source) => ({
          sourceId: source.sourceId,
          generatedAt: source.generatedAt,
          daily: source.daily.map((entry) => ({ date: entry.date, ...entry.day })),
        })),
      };

      try {
        await Bun.write(tempPath, `${JSON.stringify(serialized, null, 2)}\n`);
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
  getLatest: () => latestSnapshot ?? buildSnapshot(latestStore),
  getHistory: () => [...history],
  getVersion: () => version,
};
