export type CursorState = {
  slot: number | null;
  label: string;
  x: number;
  y: number;
  color: string;
  updatedAt: number;
  isSelf: boolean;
};

export type TelemetryDetail = {
  label: string;
  value: string;
};

export type TelemetryPoint = {
  point: number;
  value: number;
};
