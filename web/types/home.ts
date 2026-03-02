import type { CursorPayload } from "@shared/cursor";

export type CursorState = CursorPayload & {
  updatedAt: number;
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
