import { rmSync } from "node:fs";
import { rename } from "node:fs/promises";
import * as v from "valibot";
import {
  tokenUsageDatedDaySchema,
  tokenUsageSyncPayloadSchema,
  type TokenUsageDay,
  type TokenUsageDatedDay,
  type TokenUsageDailySummary,
  type TokenUsageSnapshot,
  type TokenUsageSyncPayload,
} from "@shared/stats/token-usage";
import type { StatModule } from "@server/stats/types";
import { getDataPath } from "@server/data-dir";

const DEFAULT_STALE_AFTER_MINUTES = 180;
const TOKEN_USAGE_REFRESH_INTERVAL_MS = 30_000;
const MAX_DAILY_POINTS = 30;
const TOKEN_USAGE_TIMEZONE = Bun.env.TOKEN_USAGE_TIMEZONE?.trim() || "America/Sao_Paulo";
const TOKEN_USAGE_DATE_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TOKEN_USAGE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

const persistedSourceSchema = v.object({
  sourceId: v.pipe(v.string(), v.minLength(1)),
  providerId: v.pipe(v.string(), v.minLength(1)),
  generatedAt: nonNegativeNumber,
  daily: v.array(tokenUsageDatedDaySchema),
});

const persistedStoreSchema = v.object({
  version: v.literal(2),
  sources: v.array(persistedSourceSchema),
});

type InternalSourceStore = {
  sourceId: string;
  providerId: string;
  generatedAt: number;
  daily: { date: string; day: TokenUsageDay }[];
};

type InternalStore = { sources: InternalSourceStore[] };

function createEmptyStore(): InternalStore {
  return { sources: [] };
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStaleAfterMs() {
  const configuredMinutes = Number.parseFloat(Bun.env.TOKEN_USAGE_STALE_AFTER_MINUTES ?? "");
  const minutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0
      ? configuredMinutes
      : DEFAULT_STALE_AFTER_MINUTES;
  return Math.floor(minutes * 60_000);
}

function getTodayDateKey() {
  return TOKEN_USAGE_DATE_FORMATTER.format(new Date());
}

function getWindowDateKeys() {
  const today = new Date(`${getTodayDateKey()}T00:00:00Z`);

  return Array.from({ length: MAX_DAILY_POINTS }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (MAX_DAILY_POINTS - index - 1));
    return formatUtcDate(date);
  });
}

function getUsageFilePath() {
  return getDataPath("token-usage.json");
}

function createDay(day: TokenUsageDay): TokenUsageDay {
  return {
    inputTokens: day.inputTokens,
    cachedInputTokens: day.cachedInputTokens,
    outputTokens: day.outputTokens,
    reasoningOutputTokens: day.reasoningOutputTokens,
    totalTokens: day.totalTokens,
  };
}

function createEmptyDay(): TokenUsageDay {
  return createDay({
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  });
}

function addDayUsage(target: TokenUsageDay, source: TokenUsageDay) {
  target.inputTokens += source.inputTokens;
  target.cachedInputTokens += source.cachedInputTokens;
  target.outputTokens += source.outputTokens;
  target.reasoningOutputTokens += source.reasoningOutputTokens;
  target.totalTokens += source.totalTokens;
}

function normalizeDailyEntries(
  entries: TokenUsageDatedDay[],
  windowDateSet = new Set(getWindowDateKeys()),
) {
  const byDate = new Map<string, TokenUsageDay>();

  for (const entry of entries) {
    if (!windowDateSet.has(entry.date)) continue;

    byDate.set(entry.date, createDay(entry));
  }

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, day]) => ({ date, day }));
}

function normalizeSourcePayload(payload: TokenUsageSyncPayload): InternalSourceStore {
  return {
    sourceId: payload.sourceId,
    providerId: payload.providerId,
    generatedAt: payload.generatedAt,
    daily: normalizeDailyEntries(payload.daily),
  };
}

function buildMergedDaily(store: InternalStore, windowDateSet: Set<string>) {
  const byDate = new Map<string, TokenUsageDay>();

  for (const source of store.sources) {
    for (const entry of source.daily) {
      if (!windowDateSet.has(entry.date)) continue;

      const existing = byDate.get(entry.date) ?? createEmptyDay();
      if (!byDate.has(entry.date)) {
        byDate.set(entry.date, existing);
      }
      addDayUsage(existing, entry.day);
    }
  }

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, day]) => ({ date, day }));
}

function buildWindowedDaily(store: InternalStore) {
  const windowDateKeys = getWindowDateKeys();
  const windowDateSet = new Set(windowDateKeys);
  const byDate = new Map(
    buildMergedDaily(store, windowDateSet).map((entry) => [entry.date, entry.day]),
  );

  return windowDateKeys.map((dateKey) => {
    return {
      date: dateKey,
      day: createDay(byDate.get(dateKey) ?? createEmptyDay()),
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

function buildSnapshot(store: InternalStore): TokenUsageSnapshot {
  const generatedAt = getLatestGeneratedAt(store);
  const mergedDaily = generatedAt === null ? [] : buildWindowedDaily(store);
  const isStale = generatedAt === null || Date.now() - generatedAt > getStaleAfterMs();
  const dailySummaries: TokenUsageDailySummary[] = mergedDaily.map((e) => ({
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
let latestSnapshot: TokenUsageSnapshot | null = null;
let latestFileMtimeMs: number | null = null;
let writeQueue: Promise<void> = Promise.resolve();

let history: TokenUsageSnapshot[] = [];
let version = 0;
let started = false;

function areSnapshotsEqual(current: TokenUsageSnapshot, next: TokenUsageSnapshot) {
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
  if (history.length > MAX_DAILY_POINTS) history.shift();
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
          providerId: source.providerId,
          generatedAt: source.generatedAt,
          daily: normalizeDailyEntries(source.daily),
        })),
      };
      latestFileMtimeMs = mtimeMs;
      refreshDerivedSnapshot();
      return;
    }

    console.error("[token-usage] Ignoring invalid usage file payload");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      latestStore = createEmptyStore();
      latestFileMtimeMs = null;
      refreshDerivedSnapshot();
      return;
    }
    console.error("[token-usage] Failed to refresh usage file", error);
  }
}

export function parseTokenUsageSyncPayload(input: unknown) {
  return v.safeParse(tokenUsageSyncPayloadSchema, input);
}

export function resetTokenUsageStatForTests() {
  latestStore = createEmptyStore();
  latestSnapshot = null;
  latestFileMtimeMs = null;
  writeQueue = Promise.resolve();
  history = [];
  version = 0;

  rmSync(getUsageFilePath(), { force: true });
}

export async function persistTokenUsageSyncPayload(payload: TokenUsageSyncPayload) {
  const filePath = getUsageFilePath();

  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      await refreshFromDisk(true);

      const normalizedSource = normalizeSourcePayload(payload);
      const normalized: InternalStore = {
        sources: [
          ...latestStore.sources.filter(
            (source) =>
              source.providerId !== normalizedSource.providerId ||
              source.sourceId !== normalizedSource.sourceId,
          ),
          normalizedSource,
        ].sort(
          (sourceA, sourceB) =>
            sourceA.providerId.localeCompare(sourceB.providerId) ||
            sourceA.sourceId.localeCompare(sourceB.sourceId),
        ),
      };
      const tempPath = `${filePath}.${Math.random().toString(36).slice(2)}.${Date.now()}.tmp`;
      const serialized = {
        version: 2 as const,
        sources: normalized.sources.map((source) => ({
          sourceId: source.sourceId,
          providerId: source.providerId,
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

export const tokenUsageStat: StatModule<TokenUsageSnapshot> = {
  start() {
    if (started) return;
    started = true;

    void refreshFromDisk(true);
    setInterval(() => void refreshFromDisk(), TOKEN_USAGE_REFRESH_INTERVAL_MS);
  },
  getLatest: () => latestSnapshot ?? buildSnapshot(latestStore),
  getHistory: () => [...history],
  getVersion: () => version,
};
