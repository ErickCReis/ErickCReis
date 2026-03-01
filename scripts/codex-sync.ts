import { readFile, readdir, stat } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

type CodexCliTotals = {
  totalTokens: number;
};

type CodexCliDay = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

type CodexUsageSyncPayload = {
  generatedAt: number;
  daily: CodexCliDay[];
  totals: CodexCliTotals | null;
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_CODEX_HOME = path.join(os.homedir(), ".codex");
const DEFAULT_CODEX_SESSIONS_SUBDIR = "sessions";

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
    cached_input_tokens: Math.max(current.cached_input_tokens - (previous?.cached_input_tokens ?? 0), 0),
    output_tokens: Math.max(current.output_tokens - (previous?.output_tokens ?? 0), 0),
    reasoning_output_tokens: Math.max(current.reasoning_output_tokens - (previous?.reasoning_output_tokens ?? 0), 0),
    total_tokens: Math.max(current.total_tokens - (previous?.total_tokens ?? 0), 0),
  };
}

function toDelta(raw: RawUsage): TokenUsageDelta {
  const totalTokens = raw.total_tokens > 0 ? raw.total_tokens : raw.input_tokens + raw.output_tokens;
  const cachedInputTokens = Math.min(raw.cached_input_tokens, raw.input_tokens);

  return {
    inputTokens: raw.input_tokens,
    cachedInputTokens,
    outputTokens: raw.output_tokens,
    reasoningOutputTokens: raw.reasoning_output_tokens,
    totalTokens,
  };
}

function parseDateFromSessionPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = /^(\d{4})\/(\d{2})\/(\d{2})\//.exec(normalized);
  if (match == null) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function createEmptyDay(): CodexCliDay {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function addDeltaToDay(day: CodexCliDay, delta: TokenUsageDelta) {
  day.inputTokens += delta.inputTokens;
  day.cachedInputTokens += delta.cachedInputTokens;
  day.outputTokens += delta.outputTokens;
  day.reasoningOutputTokens += delta.reasoningOutputTokens;
  day.totalTokens += delta.totalTokens;
}

async function listJsonlFiles(rootDir: string) {
  const files: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (currentDir == null) {
      continue;
    }

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      }
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

async function loadDailyUsageFromSessions(
  codexHome: string,
  timezone: string,
  since: string,
  until: string,
) {
  const sessionsDir = path.join(codexHome, DEFAULT_CODEX_SESSIONS_SUBDIR);
  const sessionsDirStat = await stat(sessionsDir).catch(() => null);
  if (sessionsDirStat == null || !sessionsDirStat.isDirectory()) {
    return new Map<string, CodexCliDay>();
  }

  const files = await listJsonlFiles(sessionsDir);
  const dailyUsage = new Map<string, CodexCliDay>();
  const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
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

    const fileContents = await readFile(filePath, "utf8");
    let previousTotals: RawUsage | null = null;

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

      let rawUsage = lastUsage;
      if (rawUsage == null && totalUsage != null) {
        rawUsage = subtractRawUsage(totalUsage, previousTotals);
      }

      if (totalUsage != null) {
        previousTotals = totalUsage;
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

function buildSyncPayload(dailyUsage: Map<string, CodexCliDay>): CodexUsageSyncPayload {
  const sortedDays = Array.from(dailyUsage.entries()).sort(([dateA], [dateB]) =>
    dateA.localeCompare(dateB),
  );
  const daily = sortedDays.map(([, day]) => ({
    inputTokens: day.inputTokens,
    cachedInputTokens: day.cachedInputTokens,
    outputTokens: day.outputTokens,
    reasoningOutputTokens: day.reasoningOutputTokens,
    totalTokens: day.totalTokens,
  }));

  const totals = daily.length
    ? daily.reduce<CodexCliTotals>(
        (accumulator, day) => ({
          totalTokens: accumulator.totalTokens + day.totalTokens,
        }),
        { totalTokens: 0 },
      )
    : null;

  return {
    generatedAt: Date.now(),
    daily,
    totals,
  };
}

async function main() {
  const syncUrl = requireEnv("CODEX_SYNC_URL");
  const syncToken = requireEnv("CODEX_SYNC_TOKEN");
  const timezone = Bun.env.CODEX_SYNC_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
  const windowDays = Number.parseInt(
    Bun.env.CODEX_SYNC_WINDOW_DAYS ?? `${DEFAULT_WINDOW_DAYS}`,
    10,
  );
  const codexHome = Bun.env.CODEX_HOME?.trim() || DEFAULT_CODEX_HOME;
  const { since, until } = getDateRange(windowDays);

  const dailyUsage = await loadDailyUsageFromSessions(codexHome, timezone, since, until);
  const payload = buildSyncPayload(dailyUsage);

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
    `[codex-sync] synced ${syncedDays} days (${since}..${until}), generatedAt=${new Date(
      generatedAt,
    ).toISOString()}`,
  );
}

void main().catch((error) => {
  console.error("[codex-sync] failed", error);
  process.exit(1);
});
