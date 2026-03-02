export function formatUptime(minutes: number) {
  if (minutes < 60) return `${Math.floor(minutes)}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
