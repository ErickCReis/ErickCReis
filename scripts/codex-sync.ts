type CodexCliTotals = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
};

type CodexCliDay = CodexCliTotals & {
  date: string;
};

type CodexCliDailyResponse = {
  daily?: CodexCliDay[];
  totals?: CodexCliTotals;
};

type CodexUsageSyncPayload = {
  generatedAt: number;
  daily: Array<
    CodexCliTotals & {
      dateLabel: string;
    }
  >;
  totals: CodexCliTotals | null;
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_LOCALE = "en-US";
const DEFAULT_WINDOW_DAYS = 30;

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
  const normalizedWindowDays = Number.isFinite(windowDays) ? Math.max(1, Math.floor(windowDays)) : 30;
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (normalizedWindowDays - 1));
  return {
    since: toIsoDate(since),
    until: toIsoDate(now),
  };
}

async function runCodexDailyCommand(timezone: string, locale: string, since: string, until: string) {
  const process = Bun.spawn(
    [
      "npx",
      "@ccusage/codex@latest",
      "daily",
      "--json",
      "--timezone",
      timezone,
      "--locale",
      locale,
      "--since",
      since,
      "--until",
      until,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `@ccusage/codex failed with exit code ${exitCode}\n${stderr || stdout || "No output returned."}`,
    );
  }

  return stdout;
}

function buildSyncPayload(rawJson: string): CodexUsageSyncPayload {
  const parsed = JSON.parse(rawJson) as CodexCliDailyResponse;
  const daily = (parsed.daily ?? []).map((entry) => ({
    dateLabel: entry.date,
    inputTokens: entry.inputTokens,
    cachedInputTokens: entry.cachedInputTokens,
    outputTokens: entry.outputTokens,
    reasoningOutputTokens: entry.reasoningOutputTokens,
    totalTokens: entry.totalTokens,
    costUSD: entry.costUSD,
  }));

  return {
    generatedAt: Date.now(),
    daily,
    totals: parsed.totals
      ? {
          inputTokens: parsed.totals.inputTokens,
          cachedInputTokens: parsed.totals.cachedInputTokens,
          outputTokens: parsed.totals.outputTokens,
          reasoningOutputTokens: parsed.totals.reasoningOutputTokens,
          totalTokens: parsed.totals.totalTokens,
          costUSD: parsed.totals.costUSD,
        }
      : null,
  };
}

async function main() {
  const syncUrl = requireEnv("CODEX_SYNC_URL");
  const syncToken = requireEnv("CODEX_SYNC_TOKEN");
  const timezone = Bun.env.CODEX_SYNC_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
  const locale = Bun.env.CODEX_SYNC_LOCALE?.trim() || DEFAULT_LOCALE;
  const windowDays = Number.parseInt(Bun.env.CODEX_SYNC_WINDOW_DAYS ?? `${DEFAULT_WINDOW_DAYS}`, 10);
  const { since, until } = getDateRange(windowDays);

  const rawJson = await runCodexDailyCommand(timezone, locale, since, until);
  const payload = buildSyncPayload(rawJson);

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
