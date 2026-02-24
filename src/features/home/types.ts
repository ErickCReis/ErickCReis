import type { CursorPayload } from "@/lib/eden";

export type ServerStats = {
  timestamp: string;
  uptimeSeconds: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  memoryHeapTotalMb: number;
  systemMemoryTotalMb: number;
  systemMemoryFreeMb: number;
  systemMemoryUsedPercent: number;
  cpuCount: number;
  cpuUsagePercent: number;
  loadAverage: [number, number, number];
  pendingRequests: number;
  pendingWebSockets: number;
  cursorSubscribers: number;
};

export type StatsBootstrap = {
  history: ServerStats[];
};

export type CursorState = CursorPayload & {
  updatedAt: number;
};

export type MetricSeries = {
  rss: number[];
  heap: number[];
  heapTotal: number[];
  cpu: number[];
  load1: number[];
  load15: number[];
  systemMemory: number[];
  requests: number[];
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
};
