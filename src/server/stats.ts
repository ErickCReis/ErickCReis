import os from "node:os";
import * as v from "valibot";

const serverStatsSchema = v.object({
  timestamp: v.string(),
  uptimeSeconds: v.number(),
  memoryRssMb: v.number(),
  memoryHeapUsedMb: v.number(),
  memoryHeapTotalMb: v.number(),
  systemMemoryTotalMb: v.number(),
  systemMemoryFreeMb: v.number(),
  systemMemoryUsedPercent: v.number(),
  cpuCount: v.number(),
  cpuUsagePercent: v.number(),
  loadAverage: v.tuple([v.number(), v.number(), v.number()]),
  pendingRequests: v.number(),
  pendingWebSockets: v.number(),
  cursorSubscribers: v.number(),
});

type ServerStats = v.InferOutput<typeof serverStatsSchema>;

const CPU_COUNT = Math.max(1, os.cpus().length);
const MAX_STATS_HISTORY = 84;
export const STATS_SAMPLE_INTERVAL_MS = 1500;

export const statsHistory: ServerStats[] = [];
export let latestStats: ServerStats = {
  timestamp: new Date().toISOString(),
  uptimeSeconds: 0,
  memoryRssMb: 0,
  memoryHeapUsedMb: 0,
  memoryHeapTotalMb: 0,
  systemMemoryTotalMb: 0,
  systemMemoryFreeMb: 0,
  systemMemoryUsedPercent: 0,
  cpuCount: CPU_COUNT,
  cpuUsagePercent: 0,
  loadAverage: [0, 0, 0],
  pendingRequests: 0,
  pendingWebSockets: 0,
  cursorSubscribers: 0,
};
let statsInterval: ReturnType<typeof setInterval> | undefined;
let previousCpuUsage = process.cpuUsage();
let previousCpuSampleAt = process.hrtime.bigint();

function getCpuUsagePercent() {
  const now = process.hrtime.bigint();
  const elapsedMicroseconds = Number((now - previousCpuSampleAt) / 1000n);
  const currentCpuUsage = process.cpuUsage();
  const usedMicroseconds =
    currentCpuUsage.user -
    previousCpuUsage.user +
    (currentCpuUsage.system - previousCpuUsage.system);

  previousCpuUsage = currentCpuUsage;
  previousCpuSampleAt = now;

  if (elapsedMicroseconds <= 0) {
    return 0;
  }

  const percent = (usedMicroseconds / (elapsedMicroseconds * CPU_COUNT)) * 100;
  return Number(Math.max(0, Math.min(100, percent)).toFixed(2));
}

function sampleServerStats(server: Bun.Server<any>): ServerStats {
  const memory = process.memoryUsage();
  const toMb = (value: number) => Number((value / 1024 / 1024).toFixed(2));
  const systemMemoryTotalMb = toMb(os.totalmem());
  const systemMemoryFreeMb = toMb(os.freemem());
  const systemMemoryUsedPercent = Number(
    (((systemMemoryTotalMb - systemMemoryFreeMb) / Math.max(1, systemMemoryTotalMb)) * 100).toFixed(
      2,
    ),
  );

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryRssMb: toMb(memory.rss),
    memoryHeapUsedMb: toMb(memory.heapUsed),
    memoryHeapTotalMb: toMb(memory.heapTotal),
    systemMemoryTotalMb,
    systemMemoryFreeMb,
    systemMemoryUsedPercent,
    cpuCount: CPU_COUNT,
    cpuUsagePercent: getCpuUsagePercent(),
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))) as [number, number, number],
    pendingRequests: server.pendingRequests,
    pendingWebSockets: server.pendingWebSockets,
    cursorSubscribers: server.subscriberCount("cursors"),
  };
}

function recordServerStatsSample(server: Bun.Server<any>) {
  const nextSample = sampleServerStats(server);
  latestStats = nextSample;
  statsHistory.push(nextSample);

  if (statsHistory.length > MAX_STATS_HISTORY) {
    statsHistory.shift();
  }
}

export function startStatsSampler(server: Bun.Server<any>) {
  if (statsInterval) {
    return;
  }

  recordServerStatsSample(server);
  statsInterval = setInterval(() => {
    recordServerStatsSample(server);
  }, STATS_SAMPLE_INTERVAL_MS);
}
