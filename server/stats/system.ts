import { readFileSync } from "node:fs";
import os from "node:os";
import type { SystemStat } from "@shared/stats/system";
import type { StatModule } from "@server/stats/types";

const MAX_HISTORY = 84;
const SAMPLE_INTERVAL_MS = 1500;
const MB = 1024 * 1024;

function readCgroupFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    return null;
  }
}

function getCgroupMemoryUsed(): number | null {
  const v2 = readCgroupFile("/sys/fs/cgroup/memory.current");
  if (v2) return Number(v2);

  const v1 = readCgroupFile("/sys/fs/cgroup/memory/memory.usage_in_bytes");
  if (v1) return Number(v1);

  return null;
}

function getCgroupMemoryLimit(): number | null {
  const v2 = readCgroupFile("/sys/fs/cgroup/memory.max");
  if (v2 && v2 !== "max") return Number(v2);

  const v1 = readCgroupFile("/sys/fs/cgroup/memory/memory.limit_in_bytes");
  if (v1) {
    const limit = Number(v1);
    // cgroup v1 reports a very large number when unlimited
    if (limit < os.totalmem() * 2) return limit;
  }

  return null;
}

function getCgroupCpuCount(): number | null {
  const v2 = readCgroupFile("/sys/fs/cgroup/cpu.max");
  if (v2) {
    const [quotaStr, periodStr] = v2.split(" ");
    if (quotaStr !== "max") {
      return Math.max(1, Math.round(Number(quotaStr) / Number(periodStr)));
    }
  }

  const quota = readCgroupFile("/sys/fs/cgroup/cpu/cpu.cfs_quota_us");
  const period = readCgroupFile("/sys/fs/cgroup/cpu/cpu.cfs_period_us");
  if (quota && period && Number(quota) > 0) {
    return Math.max(1, Math.round(Number(quota) / Number(period)));
  }

  return null;
}

const CPU_COUNT = getCgroupCpuCount() ?? Math.max(1, os.cpus().length);

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

function getMemoryInfo() {
  const cgroupUsed = getCgroupMemoryUsed();
  const cgroupTotal = getCgroupMemoryLimit();

  const usedBytes = cgroupUsed ?? os.totalmem() - os.freemem();
  const totalBytes = cgroupTotal ?? os.totalmem();

  return { usedBytes, totalBytes };
}

function sample(): SystemStat {
  const { usedBytes, totalBytes } = getMemoryInfo();
  const usedMb = toMb(usedBytes);
  const totalMb = toMb(totalBytes);

  return {
    timestamp: Date.now(),
    cpuUsagePercent: getCpuUsagePercent(),
    memoryUsedMb: usedMb,
    totalMemoryMb: totalMb,
    cpuCount: CPU_COUNT,
    systemMemoryUsedPercent: Number(
      ((usedMb / Math.max(1, totalMb)) * 100).toFixed(2),
    ),
  };
}

let latest: SystemStat = sample();
let history: SystemStat[] = [];
let version = 0;
let started = false;

export const systemStat: StatModule<SystemStat> = {
  start() {
    if (started) return;
    started = true;

    const tick = () => {
      latest = sample();
      history.push(latest);
      if (history.length > MAX_HISTORY) history.shift();
      version++;
    };

    tick();
    setInterval(tick, SAMPLE_INTERVAL_MS);
  },
  getLatest: () => latest,
  getHistory: () => [...history],
  getVersion: () => version,
};
