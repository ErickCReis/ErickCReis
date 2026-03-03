import os from "node:os";
import type { SystemStat } from "@shared/stats/system";
import type { StatModule } from "@server/stats/types";

const CPU_COUNT = Math.max(1, os.cpus().length);
const MAX_HISTORY = 84;
const SAMPLE_INTERVAL_MS = 1500;
const MB = 1024 * 1024;

let previousCpuUsage = process.cpuUsage();
let previousCpuSampleAt = Bun.nanoseconds();

function getCpuUsagePercent() {
  const now = Bun.nanoseconds();
  const elapsedMicroseconds = Number(now - previousCpuSampleAt) / 1000;
  const currentCpuUsage = process.cpuUsage();
  const usedMicroseconds =
    currentCpuUsage.user -
    previousCpuUsage.user +
    (currentCpuUsage.system - previousCpuUsage.system);

  previousCpuUsage = currentCpuUsage;
  previousCpuSampleAt = now;

  if (elapsedMicroseconds <= 0) return 0;

  const percent = (usedMicroseconds / (elapsedMicroseconds * CPU_COUNT)) * 100;
  return Number(Math.max(0, Math.min(100, percent)).toFixed(2));
}

function toMb(value: number) {
  return Number((value / MB).toFixed(2));
}

function getSystemMemoryUsedPercent() {
  const totalMb = toMb(os.totalmem());
  const freeMb = toMb(os.freemem());
  return Number((((totalMb - freeMb) / Math.max(1, totalMb)) * 100).toFixed(2));
}

function sample(): SystemStat {
  return {
    timestamp: Date.now(),
    cpuUsagePercent: getCpuUsagePercent(),
    memoryUsedMb: toMb(os.totalmem() - os.freemem()),
    totalMemoryMb: toMb(os.totalmem()),
    cpuCount: CPU_COUNT,
    systemMemoryUsedPercent: getSystemMemoryUsedPercent(),
  };
}

let latest: SystemStat = sample();
let history: SystemStat[] = [];
let dirty = false;
let started = false;

export const systemStat: StatModule<SystemStat> = {
  start() {
    if (started) return;
    started = true;

    const tick = () => {
      latest = sample();
      history.push(latest);
      if (history.length > MAX_HISTORY) history.shift();
      dirty = true;
    };

    tick();
    setInterval(tick, SAMPLE_INTERVAL_MS);
  },
  getLatest: () => latest,
  getHistory: () => [...history],
  consumeLatest() {
    if (!dirty) return null;
    dirty = false;
    return latest;
  },
};
