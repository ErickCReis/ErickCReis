import { getLocale, resolveLocale } from "virtual:translate";

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  claude: { label: "Claude", color: "#cc785c" },
  codex: { label: "Codex", color: "#10a37f" },
  pi: { label: "Pi", color: "#a78bfa" },
};
const FALLBACK_PROVIDER_COLORS = ["#7fb0ff", "#f59e0b", "#ef4444", "#22d3ee", "#e879f9"];

export function getProviderMeta(providerId: string, index: number) {
  return (
    PROVIDER_META[providerId] ?? {
      label: providerId,
      color: FALLBACK_PROVIDER_COLORS[index % FALLBACK_PROVIDER_COLORS.length] ?? "#7fb0ff",
    }
  );
}

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
