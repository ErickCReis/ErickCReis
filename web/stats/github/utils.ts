import { t } from "virtual:translate";

export function formatLastCommit(dateString: string | null): string {
  if (!dateString) return t("No commits");
  const today = startOfLocalDay(new Date());
  const commitDate = parseISODateAtLocalMidnight(dateString);
  if (!commitDate) return t("Recent");

  const diffMs = today.getTime() - commitDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return t("Today");
  if (diffDays === 1) return t("Yesterday");
  return `${diffDays}${t("d ago")}`;
}

function startOfLocalDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function parseISODateAtLocalMidnight(dateString: string) {
  const [year, month, day] = dateString.split("-").map((part) => Number.parseInt(part, 10));
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day);
}

export function formatDayRange(labels: string[]) {
  if (labels.length === 0) return "--/--";
  return `${labels[0]}-${labels[labels.length - 1]}`;
}
