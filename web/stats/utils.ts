import type { TelemetryPoint } from "@web/types/home";

export const MAX_POINTS = 84;

export function createPanelPoints(values: number[], maxPoints = MAX_POINTS): TelemetryPoint[] {
  const points = values.slice(-maxPoints);
  return points.map((value, point) => ({ point, value }));
}

export function getLatest(values: number[]) {
  return values.at(-1) ?? 0;
}

export function getPrevious(values: number[]) {
  return values.at(-2) ?? values.at(-1) ?? 0;
}

export function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

export function formatSigned(value: number, decimals: number, suffix = "") {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}${suffix}`;
}
