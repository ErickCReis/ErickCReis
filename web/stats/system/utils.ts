export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatMemory(valueMb: number) {
  return valueMb >= 1024 ? `${(valueMb / 1024).toFixed(2)} GB` : `${valueMb.toFixed(1)} MB`;
}
