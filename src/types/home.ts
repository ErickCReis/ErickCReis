import type { CursorPayload } from "@/lib/api";

export type SpotifyNowPlaying = {
  isConfigured: boolean;
  isPlaying: boolean;
  trackId: string | null;
  trackName: string | null;
  artistNames: string[];
  albumName: string | null;
  trackUrl: string | null;
  progressMs: number;
  durationMs: number;
  fetchedAt: number;
};

export type GitHubCommitStats = {
  isConfigured: boolean;
  username: string;
  year: number;
  commitsYearToDate: number;
  commitsLast7Days: number[];
  commitsLast7DayLabels: string[];
  fetchedAt: number;
};

export type ServerStats = {
  timestamp: number;
  appVersion: string;
  uptimeSeconds: number;
  memoryHeapUsedMb: number;
  systemMemoryUsedPercent: number;
  cpuUsagePercent: number;
  pendingWebSockets: number;
  cursorSubscribers: number;
  spotify: SpotifyNowPlaying;
  github: GitHubCommitStats;
};

export type CursorState = CursorPayload & {
  updatedAt: number;
};

export type MetricSeries = {
  heap: number[];
  cpu: number[];
  websockets: number[];
  subscribers: number[];
  uptimeMinutes: number[];
};

export type TelemetryDetail = {
  label: string;
  value: string;
};

export type TelemetryPoint = {
  point: number;
  value: number;
};

export type TelemetryHistoryItem = {
  title: string;
  subtitle: string;
};

export type TelemetryPanel = {
  id: string;
  title: string;
  tag: string;
  hint: string;
  current: string;
  trend: string;
  details: TelemetryDetail[];
  points: TelemetryPoint[];
  primaryColor: string;
  actionUrl?: string;
  actionLabel?: string;
  historyItems?: TelemetryHistoryItem[];
};
