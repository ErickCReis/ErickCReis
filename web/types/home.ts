import type { CursorPayload } from "@shared/telemetry";

export type { ServerStats } from "@shared/telemetry";

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
