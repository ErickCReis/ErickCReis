import { readFileSync } from "node:fs";
import os from "node:os";
import type { GitHubCommitStats } from "./github";
import { getLatestGitHubCommitStats, startGitHubPoller } from "./github";
import type { SpotifyNowPlaying } from "./spotify";
import { getLatestSpotifyNowPlaying, startSpotifyPoller } from "./spotify";

const CPU_COUNT = Math.max(1, os.cpus().length);
const MAX_STATS_HISTORY = 84;
const MB = 1024 * 1024;

export const STATS_SAMPLE_INTERVAL_MS = 1500;

export type ServerStats = {
  timestamp: number;
  appVersion: string;
  uptimeSeconds: number;
  memoryHeapUsedMb: number;
  systemMemoryUsedPercent: number;
  cpuUsagePercent: number;
  pendingWebSockets: number;
  cursorSubscribers: number;
  spotify: SpotifyNowPlaying;
  github: GitHubCommitStats;
};

function toMb(value: number) {
  return Number((value / MB).toFixed(2));
}

function resolveAppVersion() {
  const explicitVersion = Bun.env.APP_VERSION?.trim();
  if (explicitVersion) {
    return explicitVersion;
  }

  try {
    const packageJsonRaw = readFileSync(new URL("../../package.json", import.meta.url), "utf-8");
    const packageJson = JSON.parse(packageJsonRaw) as { version?: string };
    if (packageJson.version) {
      return `v${packageJson.version}`;
    }
  } catch (error) {
    console.warn("[stats] Failed to read package version", error);
  }

  return "v0.0.0";
}

const APP_VERSION = resolveAppVersion();

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
  };
}

export const statsHistory: ServerStats[] = [];
export let latestStats: ServerStats = createInitialServerStats();

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

function getSystemMemoryUsedPercent() {
  const systemMemoryTotalMb = toMb(os.totalmem());
  const systemMemoryFreeMb = toMb(os.freemem());

  return Number(
    (((systemMemoryTotalMb - systemMemoryFreeMb) / Math.max(1, systemMemoryTotalMb)) * 100).toFixed(2),
  );
}

function sampleServerStats(server: Bun.Server<any>): ServerStats {
  const memory = process.memoryUsage();

  return {
    timestamp: Date.now(),
    appVersion: APP_VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryHeapUsedMb: toMb(memory.heapUsed),
    systemMemoryUsedPercent: getSystemMemoryUsedPercent(),
    cpuUsagePercent: getCpuUsagePercent(),
    pendingWebSockets: server.pendingWebSockets,
    cursorSubscribers: server.subscriberCount("cursors"),
    spotify: getLatestSpotifyNowPlaying(),
    github: getLatestGitHubCommitStats(),
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
  recordServerStatsSample(server);

  statsInterval = setInterval(() => {
    recordServerStatsSample(server);
  }, STATS_SAMPLE_INTERVAL_MS);
}
