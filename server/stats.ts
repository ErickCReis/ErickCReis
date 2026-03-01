import os from "node:os";
import { version } from "../package.json";
import type { ServerStats } from "@shared/telemetry";
import { getLatestCodexUsageSnapshot, startCodexUsageStore } from "@server/codex-usage";
import { getLatestGitHubCommitStats, startGitHubPoller } from "@server/github";
import { getLatestSpotifyNowPlaying, startSpotifyPoller } from "@server/spotify";

const CPU_COUNT = Math.max(1, os.cpus().length);
const MAX_STATS_HISTORY = 84;
const MB = 1024 * 1024;

export const STATS_SAMPLE_INTERVAL_MS = 1500;

function toMb(value: number) {
  return Number((value / MB).toFixed(2));
}

const APP_VERSION = version;

function createInitialServerStats(): ServerStats {
  return {
    timestamp: Date.now(),
    appVersion: APP_VERSION,
    uptimeSeconds: 0,
    memoryHeapUsedMb: 0,
    systemMemoryUsedPercent: 0,
    cpuUsagePercent: 0,
    pendingWebSockets: 0,
    cursorSubscribers: 0,
    spotify: getLatestSpotifyNowPlaying(),
    github: getLatestGitHubCommitStats(),
    codex: getLatestCodexUsageSnapshot(),
  };
}

export const statsHistory: ServerStats[] = [];
export let latestStats: ServerStats = createInitialServerStats();

let statsInterval: ReturnType<typeof setInterval> | undefined;
let previousCpuUsage = process.cpuUsage();
let previousCpuSampleAt = Bun.nanoseconds();

function getCpuUsagePercent() {
  const now = Bun.nanoseconds();
  const elapsedBigInt = now - previousCpuSampleAt;
  const elapsedMicroseconds = Number(elapsedBigInt) / 1000;
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

function getSystemMemoryUsedPercent() {
  const systemMemoryTotalMb = toMb(os.totalmem());
  const systemMemoryFreeMb = toMb(os.freemem());

  return Number(
    (((systemMemoryTotalMb - systemMemoryFreeMb) / Math.max(1, systemMemoryTotalMb)) * 100).toFixed(
      2,
    ),
  );
}

function sampleServerStats(server: Bun.Server<any>): ServerStats {
  const mem = process.memoryUsage();

  return {
    timestamp: Date.now(),
    appVersion: APP_VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryHeapUsedMb: toMb(mem.heapUsed),
    systemMemoryUsedPercent: getSystemMemoryUsedPercent(),
    cpuUsagePercent: getCpuUsagePercent(),
    pendingWebSockets: server.pendingWebSockets,
    cursorSubscribers: server.subscriberCount("cursors"),
    spotify: getLatestSpotifyNowPlaying(),
    github: getLatestGitHubCommitStats(),
    codex: getLatestCodexUsageSnapshot(),
  };
}

function recordServerStatsSample(server: Bun.Server<any>) {
  latestStats = sampleServerStats(server);
  statsHistory.push(latestStats);

  if (statsHistory.length > MAX_STATS_HISTORY) {
    statsHistory.shift();
  }
}

export function startStatsSampler(server: Bun.Server<any>) {
  if (statsInterval) {
    return;
  }

  startSpotifyPoller();
  startGitHubPoller();
  startCodexUsageStore();
  recordServerStatsSample(server);

  statsInterval = setInterval(() => {
    recordServerStatsSample(server);
  }, STATS_SAMPLE_INTERVAL_MS);
}
