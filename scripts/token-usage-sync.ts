import { readdir, stat } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as v from "valibot";
import {
  tokenUsageSyncPayloadSchema,
  type TokenUsageDatedDay,
  type TokenUsageDay,
  type TokenUsageSyncPayload,
} from "@shared/stats/token-usage";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_SESSIONS_SUBDIR = "sessions";
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

type ProviderConfig<Id extends string = string> = {
  providerId: Id;
  home: string;
  sessionsDir: string;
  sourceId: string;
};

type ProviderDefinition<Id extends string = string> = {
  id: Id;
  defaultHome: string;
  getDefaultSessionsDir: (home: string) => string;
  loadDailyUsage: (
    config: ProviderConfig<Id>,
    since: string,
    until: string,
  ) => Promise<Map<string, TokenUsageDay>>;
};

function env(name: string) {
  return Bun.env[name]?.trim() || null;
}

function requireEnv(name: string) {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function expandHomePath(value: string) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function providerEnvName(providerId: string, suffix: string) {
  return `TOKEN_USAGE_${providerId.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${suffix}`;
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

  const input = ensureNumber(record.input_tokens ?? record.inputTokens ?? record.input);
  const cached = ensureNumber(
    record.cached_input_tokens ??
      record.cache_read_input_tokens ??
      record.cachedInputTokens ??
      record.cacheRead ??
      record.cache_read,
  );
  const output = ensureNumber(record.output_tokens ?? record.outputTokens ?? record.output);
  const reasoning = ensureNumber(
    record.reasoning_output_tokens ?? record.reasoningOutputTokens ?? record.reasoning,
  );
  const total = ensureNumber(record.total_tokens ?? record.totalTokens ?? record.total);

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

function isZeroDelta(delta: TokenUsageDelta) {
  return (
    delta.inputTokens === 0 &&
    delta.cachedInputTokens === 0 &&
    delta.outputTokens === 0 &&
    delta.reasoningOutputTokens === 0
  );
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

function parseDateFromCodexSessionPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = /^(\d{4})\/(\d{2})\/(\d{2})\//.exec(normalized);
  if (match == null) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseDateFromIsoSessionFilename(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = /(?:^|\/)(\d{4})-(\d{2})-(\d{2})T/.exec(normalized);
  if (match == null) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function createEmptyDay(): TokenUsageDay {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function addDeltaToDay(day: TokenUsageDay, delta: TokenUsageDelta) {
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

function dateKeyFromTimestamp(timestamp: string | number, formatter: Intl.DateTimeFormat) {
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return formatter.format(parsedDate);
}

function getEntryTimestamp(entryRecord: Record<string, unknown>) {
  if (typeof entryRecord.timestamp === "string" || typeof entryRecord.timestamp === "number") {
    return entryRecord.timestamp;
  }

  const message = asRecord(entryRecord.message);
  if (typeof message?.timestamp === "string" || typeof message?.timestamp === "number") {
    return message.timestamp;
  }

  return null;
}

function getDateFormatter() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: env("TOKEN_USAGE_TIMEZONE") ?? DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function addUsageToDailyMap(
  dailyUsage: Map<string, TokenUsageDay>,
  delta: TokenUsageDelta,
  timestamp: string | number,
  since: string,
  until: string,
  dateFormatter: Intl.DateTimeFormat,
) {
  if (isZeroDelta(delta)) return;

  const dateKey = dateKeyFromTimestamp(timestamp, dateFormatter);
  if (dateKey == null || !isWithinDateRange(dateKey, since, until)) return;

  const day = dailyUsage.get(dateKey) ?? createEmptyDay();
  if (!dailyUsage.has(dateKey)) dailyUsage.set(dateKey, day);
  addDeltaToDay(day, delta);
}

async function loadDailyUsageFromCodexSessions(
  config: ProviderConfig,
  since: string,
  until: string,
) {
  const sessionsDirStat = await stat(config.sessionsDir).catch(() => null);
  if (sessionsDirStat == null || !sessionsDirStat.isDirectory()) {
    return new Map<string, TokenUsageDay>();
  }

  const files = await listJsonlFiles(config.sessionsDir);
  const dailyUsage = new Map<string, TokenUsageDay>();
  const dateFormatter = getDateFormatter();

  for (const filePath of files) {
    const relativePath = path.relative(config.sessionsDir, filePath);
    const sessionDate = parseDateFromCodexSessionPath(relativePath);
    if (sessionDate != null && !isWithinDateRange(sessionDate, since, until)) continue;

    const fileContents = await Bun.file(filePath).text();
    let previousTotals: RawUsage | null = null;
    let previousLastUsageFingerprint: string | null = null;

    for (const line of fileContents.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (trimmedLine === "") continue;

      let parsedEntry: unknown;
      try {
        parsedEntry = JSON.parse(trimmedLine) as unknown;
      } catch {
        continue;
      }

      const entryRecord = asRecord(parsedEntry);
      if (entryRecord == null || entryRecord.type !== "event_msg") continue;

      const timestamp = getEntryTimestamp(entryRecord);
      if (timestamp == null) continue;

      const payload = asRecord(entryRecord.payload);
      if (payload == null || payload.type !== "token_count") continue;

      const info = asRecord(payload.info);
      const lastUsage = normalizeRawUsage(info?.last_token_usage);
      const totalUsage = normalizeRawUsage(info?.total_token_usage);

      let rawUsage: RawUsage | null = null;
      if (totalUsage != null) {
        rawUsage = subtractRawUsage(totalUsage, previousTotals);
      } else if (lastUsage != null) {
        const fingerprint = rawUsageFingerprint(lastUsage);
        if (fingerprint !== previousLastUsageFingerprint) rawUsage = lastUsage;
        previousLastUsageFingerprint = fingerprint;
      }

      if (totalUsage != null) {
        previousTotals = totalUsage;
        previousLastUsageFingerprint = null;
      }

      if (rawUsage == null) continue;
      addUsageToDailyMap(dailyUsage, toDelta(rawUsage), timestamp, since, until, dateFormatter);
    }
  }

  return dailyUsage;
}

async function loadDailyUsageFromPiSessions(config: ProviderConfig, since: string, until: string) {
  const sessionsDirStat = await stat(config.sessionsDir).catch(() => null);
  if (sessionsDirStat == null || !sessionsDirStat.isDirectory()) {
    return new Map<string, TokenUsageDay>();
  }

  const files = await listJsonlFiles(config.sessionsDir);
  const dailyUsage = new Map<string, TokenUsageDay>();
  const dateFormatter = getDateFormatter();

  for (const filePath of files) {
    const relativePath = path.relative(config.sessionsDir, filePath);
    const sessionDate = parseDateFromIsoSessionFilename(relativePath);
    if (sessionDate != null && sessionDate < since) continue;

    const fileContents = await Bun.file(filePath).text();

    for (const line of fileContents.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (trimmedLine === "") continue;

      let parsedEntry: unknown;
      try {
        parsedEntry = JSON.parse(trimmedLine) as unknown;
      } catch {
        continue;
      }

      const entryRecord = asRecord(parsedEntry);
      if (entryRecord == null || entryRecord.type !== "message") continue;

      const message = asRecord(entryRecord.message);
      if (message?.role !== "assistant") continue;

      const usage = normalizeRawUsage(message.usage);
      const timestamp = getEntryTimestamp(entryRecord);
      if (usage == null || timestamp == null) continue;

      addUsageToDailyMap(dailyUsage, toDelta(usage), timestamp, since, until, dateFormatter);
    }
  }

  return dailyUsage;
}

function normalizeClaudeUsage(value: unknown): RawUsage | null {
  const record = asRecord(value);
  if (record == null) {
    return null;
  }

  // Claude's `input_tokens` excludes cached tokens, which are billed separately
  // via cache_read_input_tokens (cache hits) and cache_creation_input_tokens
  // (cache writes). Fold both into the input total so it lines up with how the
  // other providers report a single inclusive input figure.
  const uncachedInput = ensureNumber(record.input_tokens);
  const cacheRead = ensureNumber(record.cache_read_input_tokens);
  const cacheCreation = ensureNumber(record.cache_creation_input_tokens);
  const output = ensureNumber(record.output_tokens);
  const inputTokens = uncachedInput + cacheRead + cacheCreation;

  return {
    input_tokens: inputTokens,
    cached_input_tokens: cacheRead,
    output_tokens: output,
    reasoning_output_tokens: 0,
    total_tokens: inputTokens + output,
  };
}

async function loadDailyUsageFromClaudeSessions(
  config: ProviderConfig,
  since: string,
  until: string,
) {
  const sessionsDirStat = await stat(config.sessionsDir).catch(() => null);
  if (sessionsDirStat == null || !sessionsDirStat.isDirectory()) {
    return new Map<string, TokenUsageDay>();
  }

  const files = await listJsonlFiles(config.sessionsDir);
  const dailyUsage = new Map<string, TokenUsageDay>();
  const dateFormatter = getDateFormatter();
  const seenMessageIds = new Set<string>();

  for (const filePath of files) {
    const fileContents = await Bun.file(filePath).text();

    for (const line of fileContents.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (trimmedLine === "") continue;

      let parsedEntry: unknown;
      try {
        parsedEntry = JSON.parse(trimmedLine) as unknown;
      } catch {
        continue;
      }

      const entryRecord = asRecord(parsedEntry);
      if (entryRecord == null || entryRecord.type !== "assistant") continue;

      const message = asRecord(entryRecord.message);
      if (message?.role !== "assistant") continue;

      // The same assistant response can reappear across resumed session files;
      // dedupe by its API message id so usage is only counted once.
      const messageId = typeof message.id === "string" ? message.id : null;
      if (messageId != null) {
        if (seenMessageIds.has(messageId)) continue;
        seenMessageIds.add(messageId);
      }

      const usage = normalizeClaudeUsage(message.usage);
      const timestamp = getEntryTimestamp(entryRecord);
      if (usage == null || timestamp == null) continue;

      addUsageToDailyMap(dailyUsage, toDelta(usage), timestamp, since, until, dateFormatter);
    }
  }

  return dailyUsage;
}

const providers = {
  pi: {
    id: "pi",
    defaultHome: path.join(os.homedir(), ".pi", "agent"),
    getDefaultSessionsDir: (home) => path.join(home, DEFAULT_SESSIONS_SUBDIR),
    loadDailyUsage: loadDailyUsageFromPiSessions,
  },
  codex: {
    id: "codex",
    defaultHome: path.join(os.homedir(), ".codex"),
    getDefaultSessionsDir: (home) => path.join(home, DEFAULT_SESSIONS_SUBDIR),
    loadDailyUsage: loadDailyUsageFromCodexSessions,
  },
  claude: {
    id: "claude",
    defaultHome: path.join(os.homedir(), ".claude"),
    getDefaultSessionsDir: (home) => path.join(home, "projects"),
    loadDailyUsage: loadDailyUsageFromClaudeSessions,
  },
} satisfies Record<string, ProviderDefinition>;

type ProviderId = keyof typeof providers;

function buildSyncPayload(
  config: ProviderConfig,
  dailyUsage: Map<string, TokenUsageDay>,
): TokenUsageSyncPayload {
  const sortedDays = Array.from(dailyUsage.entries()).sort(([dateA], [dateB]) =>
    dateA.localeCompare(dateB),
  );
  const daily: TokenUsageDatedDay[] = sortedDays.map(([date, day]) => ({
    date,
    inputTokens: day.inputTokens,
    cachedInputTokens: day.cachedInputTokens,
    outputTokens: day.outputTokens,
    reasoningOutputTokens: day.reasoningOutputTokens,
    totalTokens: day.totalTokens,
  }));

  const totals = daily.length
    ? daily.reduce(
        (accumulator, day) => ({ totalTokens: accumulator.totalTokens + day.totalTokens }),
        { totalTokens: 0 },
      )
    : null;

  return {
    sourceId: config.sourceId,
    providerId: config.providerId,
    generatedAt: Date.now(),
    daily,
    totals,
  };
}

function getMachineFingerprint() {
  if (os.platform() === "linux") return STABLE_SERVER_SOURCE_ID;

  const hostname = os.hostname().trim();
  const normalizedHost = hostname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedHost || "local";
}

function isProviderId(value: string): value is ProviderId {
  return value in providers;
}

function parseProviderSelection() {
  const raw =
    Bun.argv.find((arg) => arg.startsWith("--providers="))?.slice("--providers=".length) ??
    env("TOKEN_USAGE_PROVIDERS") ??
    "all";
  const selected = new Set<ProviderId>();

  for (const value of raw.split(",").map((item) => item.trim().toLowerCase())) {
    if (value === "" || value === "all") {
      for (const providerId of Object.keys(providers)) selected.add(providerId as ProviderId);
      continue;
    }

    if (!isProviderId(value)) {
      throw new Error(
        `Unsupported token usage provider: ${value}. Available providers: ${Object.keys(providers).join(", ")}`,
      );
    }

    selected.add(value);
  }

  return [...selected];
}

function resolveSourceId(providerId: ProviderId, selectedProviderCount: number) {
  const providerOverride = env(providerEnvName(providerId, "SOURCE_ID"));
  if (providerOverride) return providerOverride;

  const genericOverride = env("TOKEN_USAGE_SOURCE_ID");
  if (genericOverride && selectedProviderCount === 1) return genericOverride;

  return `${providerId}-${getMachineFingerprint()}`;
}

function buildProviderConfig(
  providerId: ProviderId,
  selectedProviderCount: number,
): ProviderConfig<ProviderId> {
  const provider = providers[providerId];
  const home = expandHomePath(env(providerEnvName(providerId, "HOME")) ?? provider.defaultHome);
  const sessionsDir = expandHomePath(
    env(providerEnvName(providerId, "SESSIONS_DIR")) ?? provider.getDefaultSessionsDir(home),
  );

  return {
    providerId,
    home,
    sessionsDir,
    sourceId: resolveSourceId(providerId, selectedProviderCount),
  };
}

async function sendPayload(syncUrl: string, syncToken: string, payload: TokenUsageSyncPayload) {
  const validatedPayload = v.safeParse(tokenUsageSyncPayloadSchema, payload);
  if (!validatedPayload.success) {
    throw new Error(`Invalid sync payload: ${JSON.stringify(validatedPayload.issues)}`);
  }

  if (env("TOKEN_USAGE_DRY_RUN") === "1") {
    console.log(JSON.stringify(payload, null, 2));
    return { daysSynced: payload.daily.length, generatedAt: payload.generatedAt };
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

  return (await response.json()) as { daysSynced?: number; generatedAt?: number };
}

async function main() {
  const syncUrl = requireEnv("TOKEN_USAGE_SYNC_URL");
  const syncToken = requireEnv("TOKEN_USAGE_SYNC_TOKEN");
  const windowDays = Number.parseInt(
    env("TOKEN_USAGE_SYNC_WINDOW_DAYS") ?? `${DEFAULT_WINDOW_DAYS}`,
    10,
  );
  const { since, until } = getDateRange(windowDays);
  const selectedProviders = parseProviderSelection();
  const configs = selectedProviders.map((providerId) =>
    buildProviderConfig(providerId, selectedProviders.length),
  );

  for (const config of configs) {
    const provider = providers[config.providerId];
    const dailyUsage = await provider.loadDailyUsage(config, since, until);
    const payload = buildSyncPayload(config, dailyUsage);
    const output = await sendPayload(syncUrl, syncToken, payload);
    const syncedDays = output.daysSynced ?? payload.daily.length;
    const generatedAt = output.generatedAt ?? payload.generatedAt;

    console.log(
      `[token-usage-sync] provider=${payload.providerId} source=${payload.sourceId} synced ${syncedDays} days (${since}..${until}), generatedAt=${new Date(
        generatedAt,
      ).toISOString()}`,
    );
  }
}

void main().catch((error) => {
  console.error("[token-usage-sync] failed", error);
  process.exit(1);
});
