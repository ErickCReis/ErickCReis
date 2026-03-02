export function formatDayRange(labels: string[]) {
  if (labels.length === 0) return "--/--";
  return `${labels[0]}-${labels[labels.length - 1]}`;
}
