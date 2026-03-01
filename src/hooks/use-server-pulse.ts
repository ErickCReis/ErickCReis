import { MAX_POINTS } from "@/constants/telemetry";
import type {
  MetricSeries,
  ServerStats,
  TelemetryHistoryItem,
  TelemetryPanel,
  TelemetryPoint,
} from "@/types/home";
import { subscribeServerStats } from "@/lib/api";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
} from "solid-js";

const DEFAULT_VERSION = "v0.0.0";
const DEFAULT_GITHUB_USER = "ErickCReis";
const DEFAULT_CODEX_STATUS = "Awaiting sync";

function createSeriesFromHistory(history: ServerStats[]): MetricSeries {
  const historySlice = history.slice(-MAX_POINTS);

  return {
    heap: historySlice.map((sample) => sample.memoryHeapUsedMb),
    cpu: historySlice.map((sample) => sample.cpuUsagePercent),
    websockets: historySlice.map((sample) => sample.pendingWebSockets),
    subscribers: historySlice.map((sample) => sample.cursorSubscribers),
    uptimeMinutes: historySlice.map((sample) => sample.uptimeSeconds / 60),
  };
}

function mergeSamples(...batches: ServerStats[][]) {
  const byTimestamp = new Map<number, ServerStats>();

  for (const batch of batches) {
    for (const sample of batch) {
      byTimestamp.set(sample.timestamp, sample);
    }
  }

  return [...byTimestamp.values()]
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-MAX_POINTS);
}

function createPanelPoints(values: number[], maxPoints = MAX_POINTS): TelemetryPoint[] {
  const points = values.slice(-maxPoints);
  return points.map((value, point) => ({ point, value }));
}

function getLatest(values: number[]) {
  return values.at(-1) ?? 0;
}

function getPrevious(values: number[]) {
  return values.at(-2) ?? values.at(-1) ?? 0;
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatTokenCount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatCompactTokenCount(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return `${Math.round(value)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatMemory(valueMb: number) {
  return valueMb >= 1024 ? `${(valueMb / 1024).toFixed(2)} GB` : `${valueMb.toFixed(1)} MB`;
}

function formatUptime(minutes: number) {
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${Math.floor(minutes % 60)}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatSigned(value: number, decimals: number, suffix = "") {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}${suffix}`;
}

function formatGeneratedAt(value: number | null) {
  if (!value) {
    return "--:--";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayRange(labels: string[]) {
  if (labels.length === 0) {
    return "--/--";
  }

  return `${labels[0]}-${labels[labels.length - 1]}`;
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getRecentSpotifyTracks(
  samples: ServerStats[],
  currentTrackId: string | null,
  maxItems = 3,
) {
  const results: TelemetryHistoryItem[] = [];
  const seenTrackIds = new Set<string>();

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const spotify = samples[index]?.spotify;
    if (!spotify?.trackId || !spotify.trackName) {
      continue;
    }

    if (spotify.trackId === currentTrackId || seenTrackIds.has(spotify.trackId)) {
      continue;
    }

    seenTrackIds.add(spotify.trackId);
    results.push({
      title: spotify.trackName,
      subtitle: spotify.artistNames.join(", ") || "Unknown artist",
    });

    if (results.length >= maxItems) {
      break;
    }
  }

  return results;
}

export function useServerPulse(history: Accessor<ServerStats[] | undefined>) {
  const [samples, setSamples] = createSignal<ServerStats[]>([]);

  createEffect(() => {
    const historyValue = history();
    if (!historyValue?.length) {
      return;
    }

    setSamples((previous) => mergeSamples(previous, historyValue));
  });

  onMount(() => {
    const controller = new AbortController();

    void subscribeServerStats((payload) => {
      setSamples((previous) => mergeSamples(previous, [payload]));
    }, controller.signal).catch((error) => {
      if (!controller.signal.aborted) {
        console.error(error);
      }
    });

    onCleanup(() => {
      controller.abort();
    });
  });

  const panels = createMemo<TelemetryPanel[]>(() => {
    const sampleHistory = samples();
    const latestSample = sampleHistory.at(-1);
    const currentSeries = createSeriesFromHistory(sampleHistory);

    const latestCpu = getLatest(currentSeries.cpu);
    const previousCpu = getPrevious(currentSeries.cpu);
    const latestHeap = getLatest(currentSeries.heap);
    const latestUptime = getLatest(currentSeries.uptimeMinutes);
    const latestSubscribers = getLatest(currentSeries.subscribers);
    const latestWebSockets = getLatest(currentSeries.websockets);
    const previousWebSockets = getPrevious(currentSeries.websockets);

    const github = latestSample?.github;
    const commitsLast7Days = github?.commitsLast7Days ?? [];
    const commitsLast7DayLabels = github?.commitsLast7DayLabels ?? [];
    const commitsLast7DaysTotal = commitsLast7Days.reduce((sum, value) => sum + value, 0);
    const commitsToday = commitsLast7Days.at(-1) ?? 0;
    const codex = latestSample?.codex;
    const codexLatestDay = codex?.latestDay;
    const codexDaily = codex?.daily ?? [];
    const codexTotals = codex?.totals;
    const codexDailyTokenPoints = codexDaily.map((entry) => entry.totalTokens);

    const spotify = latestSample?.spotify;
    const spotifyArtists = spotify?.artistNames.join(", ") || "No artist";
    const spotifyTrackName = spotify?.trackName ?? "Nothing playing";
    const spotifyAlbum = spotify?.albumName ?? "No album";
    const spotifyStatus = !spotify?.isConfigured
      ? "Not configured"
      : spotify.isPlaying
        ? "Playing"
        : "Idle";
    const spotifyProgressLabel =
      spotify && spotify.durationMs > 0
        ? `${formatDuration(spotify.progressMs)} / ${formatDuration(spotify.durationMs)}`
        : "--:-- / --:--";
    const recentSpotifyTracks = getRecentSpotifyTracks(sampleHistory, spotify?.trackId ?? null);

    return [
      {
        id: "codex",
        title: "Codex Usage",
        tag: "codex/daily",
        hint: !codexLatestDay
          ? "Awaiting first hourly sync from local machine"
          : codex?.isStale
            ? "Sync stale: no successful update in the configured stale window"
            : "Hourly token usage sync from local machine",
        current: codexLatestDay
          ? `${formatCompactTokenCount(codexLatestDay.totalTokens)} tokens`
          : DEFAULT_CODEX_STATUS,
        trend: "--",
        details: codexLatestDay
          ? [
              { label: "Input", value: formatTokenCount(codexLatestDay.inputTokens) },
              { label: "Cached", value: formatTokenCount(codexLatestDay.cachedInputTokens) },
              { label: "Output", value: formatTokenCount(codexLatestDay.outputTokens) },
              { label: "Reasoning", value: formatTokenCount(codexLatestDay.reasoningOutputTokens) },
              {
                label: "30d total",
                value: formatTokenCount(codexTotals?.totalTokens ?? codexLatestDay.totalTokens),
              },
              { label: "Updated", value: formatGeneratedAt(codex?.generatedAt ?? null) },
            ]
          : [
              { label: "Status", value: DEFAULT_CODEX_STATUS },
              { label: "Updated", value: formatGeneratedAt(codex?.generatedAt ?? null) },
            ],
        points: createPanelPoints(codexDailyTokenPoints, 30),
        primaryColor: "#7fb0ff",
      },
      {
        id: "system",
        title: "System",
        tag: "cpu/mem",
        hint: "Live runtime usage from the current server process",
        current: `${formatPercent(latestCpu)} cpu`,
        trend: formatSigned(latestCpu - previousCpu, 1, "%"),
        details: [
          { label: "CPU", value: formatPercent(latestCpu) },
          { label: "Heap", value: formatMemory(latestHeap) },
          { label: "Memory", value: formatPercent(latestSample?.systemMemoryUsedPercent ?? 0) },
        ],
        points: createPanelPoints(currentSeries.cpu),
        primaryColor: "#f1c18b",
      },
      {
        id: "server",
        title: "Server",
        tag: "uptime/ver",
        hint: "Server identity and uptime lifecycle",
        current: formatUptime(latestUptime),
        trend: latestSample?.appVersion ?? DEFAULT_VERSION,
        details: [
          { label: "Uptime", value: formatUptime(latestUptime) },
          { label: "Version", value: latestSample?.appVersion ?? DEFAULT_VERSION },
        ],
        points: createPanelPoints(currentSeries.uptimeMinutes),
        primaryColor: "#8edec9",
      },
      {
        id: "websocket",
        title: "WebSocket",
        tag: "ws/subs",
        hint: "Live websocket and cursor subscriber activity",
        current: `${formatCount(latestWebSockets)} sockets`,
        trend: formatSigned(latestWebSockets - previousWebSockets, 0, " sockets"),
        details: [
          { label: "Sockets", value: formatCount(latestWebSockets) },
          { label: "Subs", value: formatCount(latestSubscribers) },
        ],
        points: createPanelPoints(currentSeries.websockets),
        primaryColor: "#9ccfd2",
      },
      {
        id: "github",
        title: "Commits",
        tag: "github/7d",
        hint: "GitHub commit search counts for the current year and last 7 days",
        current: `${formatCount(github?.commitsYearToDate ?? 0)} ytd`,
        trend: `${formatCount(commitsLast7DaysTotal)} in 7d`,
        details: [
          { label: "Year", value: `${github?.year ?? new Date().getFullYear()}` },
          { label: "Today", value: formatCount(commitsToday) },
          { label: "Range", value: formatDayRange(commitsLast7DayLabels) },
          { label: "User", value: github?.username ?? DEFAULT_GITHUB_USER },
        ],
        points: createPanelPoints(commitsLast7Days, 7),
        primaryColor: "#8ec7ff",
        actionUrl: github?.username ? `https://github.com/${github.username}` : undefined,
        actionLabel: "Profile",
      },
      {
        id: "spotify",
        title: "Now Playing",
        tag: "spotify/live",
        hint: !spotify?.isConfigured
          ? "Spotify is not configured for this deployment"
          : spotify.isPlaying
            ? "Current Spotify playback for this account"
            : "Spotify is connected but nothing is currently playing",
        current: spotifyTrackName,
        trend: spotifyArtists,
        details: [
          { label: "Track", value: spotifyTrackName },
          { label: "Artist", value: spotifyArtists },
          { label: "Status", value: spotifyStatus },
          { label: "Album", value: spotifyAlbum },
          { label: "Progress", value: spotifyProgressLabel },
        ],
        points: [],
        primaryColor: "#1db954",
        actionUrl: spotify?.trackUrl ?? undefined,
        actionLabel: "Open",
        historyItems: recentSpotifyTracks,
      },
    ];
  });

  return { panels };
}
