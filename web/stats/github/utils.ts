export function formatLastCommit(dateString: string | null): string {
  if (!dateString) return "No commits";
  const today = startOfLocalDay(new Date());
  const commitDate = parseISODateAtLocalMidnight(dateString);
  if (!commitDate) return "Recent";

  const diffMs = today.getTime() - commitDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
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
