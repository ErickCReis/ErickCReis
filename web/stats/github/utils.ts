export function formatLastCommit(dateString: string | null): string {
  if (!dateString) return "No commits";
  const now = new Date();
  const commitDate = new Date(dateString + "T12:00:00");
  const todayStr = formatDateISO(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = formatDateISO(yesterdayDate);

  if (dateString === todayStr) return "Today";
  if (dateString === yesterdayStr) return "Yesterday";

  const diffMs = now.getTime() - commitDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays}d ago`;
}

function formatDateISO(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDayRange(labels: string[]) {
  if (labels.length === 0) return "--/--";
  return `${labels[0]}-${labels[labels.length - 1]}`;
}
