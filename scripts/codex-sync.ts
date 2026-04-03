import { readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as v from "valibot";
import {
  codexUsageSyncPayloadSchema,
  type CodexUsageSyncPayload,
  type CodexUsageDatedDay,
  type CodexUsageDay,
} from "@shared/stats/codex";

const CODEX_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_CODEX_HOME = path.join(os.homedir(), ".codex");
const DEFAULT_CODEX_SESSIONS_SUBDIR = "sessions";
const STABLE_SERVER_SOURCE_ID = "vps-prod";

type RawUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
};

type TokenUsageDelta = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

function requireEnv(name: string) {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(windowDays: number) {
  const normalizedWindowDays = Number.isFinite(windowDays)
    ? Math.max(1, Math.floor(windowDays))
    : DEFAULT_WINDOW_DAYS;
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (normalizedWindowDays - 1));
  return {
    since: toIsoDate(since),
    until: toIsoDate(now),
  };
}

function isWithinDateRange(date: string, since: string, until: string) {
  return date >= since && date <= until;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function ensureNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeRawUsage(value: unknown): RawUsage | null {
  const record = asRecord(value);
  if (record == null) {
    return null;
  }

  const input = ensureNumber(record.input_tokens);
  const cached = ensureNumber(record.cached_input_tokens ?? record.cache_read_input_tokens);
  const output = ensureNumber(record.output_tokens);
  const reasoning = ensureNumber(record.reasoning_output_tokens);
  const total = ensureNumber(record.total_tokens);

  return {
    input_tokens: input,
    cached_input_tokens: cached,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: total > 0 ? total : input + output,
  };
}

function subtractRawUsage(current: RawUsage, previous: RawUsage | null): RawUsage {
  return {
    input_tokens: Math.max(current.input_tokens - (previous?.input_tokens ?? 0), 0),
    cached_input_tokens: Math.max(
      current.cached_input_tokens - (previous?.cached_input_tokens ?? 0),
      0,
    ),
    output_tokens: Math.max(current.output_tokens - (previous?.output_tokens ?? 0), 0),
    reasoning_output_tokens: Math.max(
      current.reasoning_output_tokens - (previous?.reasoning_output_tokens ?? 0),
      0,
    ),
    total_tokens: Math.max(current.total_tokens - (previous?.total_tokens ?? 0), 0),
  };
}

function toDelta(raw: RawUsage): TokenUsageDelta {
  const totalTokens =
    raw.total_tokens > 0 ? raw.total_tokens : raw.input_tokens + raw.output_tokens;
  const cachedInputTokens = Math.min(raw.cached_input_tokens, raw.input_tokens);

  return {
    inputTokens: raw.input_tokens,
    cachedInputTokens,
    outputTokens: raw.output_tokens,
    reasoningOutputTokens: raw.reasoning_output_tokens,
    totalTokens,
  };
}

function rawUsageFingerprint(raw: RawUsage) {
  return [
    raw.input_tokens,
    raw.cached_input_tokens,
    raw.output_tokens,
    raw.reasoning_output_tokens,
    raw.total_tokens,
  ].join(":");
}

function parseDateFromSessionPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = /^(\d{4})\/(\d{2})\/(\d{2})\//.exec(normalized);
  if (match == null) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function createEmptyDay(): CodexUsageDay {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function addDeltaToDay(day: CodexUsageDay, delta: TokenUsageDelta) {
  day.inputTokens += delta.inputTokens;
  day.cachedInputTokens += delta.cachedInputTokens;
  day.outputTokens += delta.outputTokens;
  day.reasoningOutputTokens += delta.reasoningOutputTokens;
  day.totalTokens += delta.totalTokens;
}

async function listJsonlFiles(rootDir: string) {
  const entries = await readdir(rootDir, { recursive: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (typeof entry === "string" && entry.endsWith(".jsonl")) {
      files.push(path.join(rootDir, entry));
    }
  }

  files.sort();
  return files;
}

function dateKeyFromTimestamp(timestamp: string, formatter: Intl.DateTimeFormat) {
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return formatter.format(parsedDate);
}

async function loadDailyUsageFromSessions(codexHome: string, since: string, until: string) {
  const sessionsDir = path.join(codexHome, DEFAULT_CODEX_SESSIONS_SUBDIR);
  const sessionsDirStat = await stat(sessionsDir).catch(() => null);
  if (sessionsDirStat == null || !sessionsDirStat.isDirectory()) {
    return new Map<string, CodexUsageDay>();
  }

  const files = await listJsonlFiles(sessionsDir);
  const dailyUsage = new Map<string, CodexUsageDay>();
  const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: CODEX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const filePath of files) {
    const relativePath = path.relative(sessionsDir, filePath);
    const sessionDate = parseDateFromSessionPath(relativePath);
    if (sessionDate != null && !isWithinDateRange(sessionDate, since, until)) {
      continue;
    }

    const fileContents = await Bun.file(filePath).text();
    let previousTotals: RawUsage | null = null;
    let previousLastUsageFingerprint: string | null = null;

    for (const line of fileContents.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (trimmedLine === "") {
        continue;
      }

      let parsedEntry: unknown;
      try {
        parsedEntry = JSON.parse(trimmedLine) as unknown;
      } catch {
        continue;
      }

      const entryRecord = asRecord(parsedEntry);
      if (entryRecord == null || entryRecord.type !== "event_msg") {
        continue;
      }

      const timestamp = typeof entryRecord.timestamp === "string" ? entryRecord.timestamp : null;
      if (timestamp == null) {
        continue;
      }

      const payload = asRecord(entryRecord.payload);
      if (payload == null || payload.type !== "token_count") {
        continue;
      }

      const info = asRecord(payload.info);
      const lastUsage = normalizeRawUsage(info?.last_token_usage);
      const totalUsage = normalizeRawUsage(info?.total_token_usage);

      let rawUsage: RawUsage | null = null;
      if (totalUsage != null) {
        rawUsage = subtractRawUsage(totalUsage, previousTotals);
      } else if (lastUsage != null) {
        const fingerprint = rawUsageFingerprint(lastUsage);
        if (fingerprint !== previousLastUsageFingerprint) {
          rawUsage = lastUsage;
        }
        previousLastUsageFingerprint = fingerprint;
      }

      if (totalUsage != null) {
        previousTotals = totalUsage;
        previousLastUsageFingerprint = null;
      }

      if (rawUsage == null) {
        continue;
      }

      const delta = toDelta(rawUsage);
      if (
        delta.inputTokens === 0 &&
        delta.cachedInputTokens === 0 &&
        delta.outputTokens === 0 &&
        delta.reasoningOutputTokens === 0
      ) {
        continue;
      }

      const dateKey = dateKeyFromTimestamp(timestamp, dateFormatter);
      if (dateKey == null || !isWithinDateRange(dateKey, since, until)) {
        continue;
      }

      const day = dailyUsage.get(dateKey) ?? createEmptyDay();
      if (!dailyUsage.has(dateKey)) {
        dailyUsage.set(dateKey, day);
      }
      addDeltaToDay(day, delta);
    }
  }

  return dailyUsage;
}

function buildSyncPayload(dailyUsage: Map<string, CodexUsageDay>): CodexUsageSyncPayload {
  const sortedDays = Array.from(dailyUsage.entries()).sort(([dateA], [dateB]) =>
    dateA.localeCompare(dateB),
  );
  const daily: CodexUsageDatedDay[] = sortedDays.map(([date, day]) => ({
    date,
    inputTokens: day.inputTokens,
    cachedInputTokens: day.cachedInputTokens,
    outputTokens: day.outputTokens,
    reasoningOutputTokens: day.reasoningOutputTokens,
    totalTokens: day.totalTokens,
  }));

  const totals = daily.length
    ? daily.reduce(
        (accumulator, day) => ({
          totalTokens: accumulator.totalTokens + day.totalTokens,
        }),
        { totalTokens: 0 },
      )
    : null;

  return {
    sourceId: getMachineFingerprint(),
    generatedAt: Date.now(),
    daily,
    totals,
  };
}

function getMachineFingerprint() {
  if (os.platform() === "linux") {
    return STABLE_SERVER_SOURCE_ID;
  }

  const hostname = os.hostname().trim();
  const normalizedHost = hostname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedHost || "local";
}

async function main() {
  const syncUrl = requireEnv("CODEX_SYNC_URL");
  const syncToken = requireEnv("CODEX_SYNC_TOKEN");
  const windowDays = Number.parseInt(
    Bun.env.CODEX_SYNC_WINDOW_DAYS ?? `${DEFAULT_WINDOW_DAYS}`,
    10,
  );
  const codexHome = Bun.env.CODEX_HOME?.trim() || DEFAULT_CODEX_HOME;
  const { since, until } = getDateRange(windowDays);

  const dailyUsage = await loadDailyUsageFromSessions(codexHome, since, until);
  const payload = buildSyncPayload(dailyUsage);

  const validatedPayload = v.safeParse(codexUsageSyncPayloadSchema, payload);
  if (!validatedPayload.success) {
    throw new Error(`Invalid sync payload: ${JSON.stringify(validatedPayload.issues)}`);
  }

  const response = await fetch(syncUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${syncToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Sync endpoint returned ${response.status}: ${responseText}`);
  }

  const output = (await response.json()) as { daysSynced?: number; generatedAt?: number };
  const syncedDays = output.daysSynced ?? payload.daily.length;
  const generatedAt = output.generatedAt ?? payload.generatedAt;

  console.log(
    `[codex-sync] source=${payload.sourceId} synced ${syncedDays} days (${since}..${until}), generatedAt=${new Date(
      generatedAt,
    ).toISOString()}`,
  );
}

void main().catch((error) => {
  console.error("[codex-sync] failed", error);
  process.exit(1);
});
