import { getLocale, resolveLocale } from "virtual:translate";

export function formatTokenCount(value: number) {
  return Math.round(value).toLocaleString(resolveLocale(getLocale()));
}

export function formatCompactTokenCount(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

export function formatGeneratedAt(value: number | null) {
  if (value == null) return "--:--";
  return new Date(value).toLocaleTimeString(resolveLocale(getLocale()), {
    hour: "2-digit",
    minute: "2-digit",
  });
}
