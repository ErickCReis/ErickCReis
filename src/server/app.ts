import os from "node:os";
import { existsSync } from "node:fs";
import { staticPlugin } from "@elysiajs/static";
import { Elysia, t } from "elysia";
import { blog } from "content/blog";

const pageAssets = existsSync("./src/pages") ? "src/pages" : "pages";

const cursorPayloadSchema = t.Object({
  id: t.String(),
  x: t.Number(),
  y: t.Number(),
  color: t.Optional(t.String()),
});

type ServerStats = {
  timestamp: string;
  uptimeSeconds: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  memoryHeapTotalMb: number;
  systemMemoryTotalMb: number;
  systemMemoryFreeMb: number;
  systemMemoryUsedPercent: number;
  cpuCount: number;
  cpuUsagePercent: number;
  loadAverage: [number, number, number];
  pendingRequests: number;
  pendingWebSockets: number;
  cursorSubscribers: number;
};

const CPU_COUNT = Math.max(1, os.cpus().length);
const STATS_SAMPLE_INTERVAL_MS = 1500;
const MAX_STATS_HISTORY = 84;
const statsHistory: ServerStats[] = [];
let latestStats: ServerStats = {
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

function sampleServerStats(server: Bun.Server): ServerStats {
  const memory = process.memoryUsage();
  const toMb = (value: number) => Number((value / 1024 / 1024).toFixed(2));
  const systemMemoryTotalMb = toMb(os.totalmem());
  const systemMemoryFreeMb = toMb(os.freemem());
  const systemMemoryUsedPercent = Number(
    (((systemMemoryTotalMb - systemMemoryFreeMb) / Math.max(1, systemMemoryTotalMb)) * 100).toFixed(2),
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

function recordServerStatsSample(server: Bun.Server) {
  const nextSample = sampleServerStats(server);
  latestStats = nextSample;
  statsHistory.push(nextSample);

  if (statsHistory.length > MAX_STATS_HISTORY) {
    statsHistory.shift();
  }
}

export function startStatsSampler(server: Bun.Server) {
  if (statsInterval) {
    return;
  }

  recordServerStatsSample(server);
  statsInterval = setInterval(() => {
    recordServerStatsSample(server);
  }, STATS_SAMPLE_INTERVAL_MS);
}

export const app = new Elysia()
  .use(
    await staticPlugin({
      assets: pageAssets,
      prefix: "/",
      indexHTML: true,
    }),
  )
  .get("/health", () => "ok")
  .get("/api/blog", async () => {
    const posts = await blog.list();
    return posts
      .map((post) => ({
        slug: post.path.replace(/\.(md|mdx)$/i, ""),
        title: post.compiled.frontmatter.title,
        description: post.compiled.frontmatter.description,
        date: new Date(post.compiled.frontmatter.date).toISOString().slice(0, 10),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  })
  .get("/api/stats", () => latestStats)
  .get("/api/stats/bootstrap", ({ set }) => {
    set.headers["cache-control"] = "no-store";

    return {
      history: statsHistory,
    };
  })
  .get("/api/stats/stream", ({ set }) => {
    set.headers["content-type"] = "text/event-stream";
    set.headers["cache-control"] = "no-cache";
    set.headers.connection = "keep-alive";

    let interval: ReturnType<typeof setInterval> | undefined;

    return new ReadableStream({
      start(controller) {
        const send = () => {
          try {
            const data = JSON.stringify(latestStats);
            controller.enqueue(data);
          } catch {
            if (interval) {
              clearInterval(interval);
            }
          }
        };

        send();
        interval = setInterval(send, STATS_SAMPLE_INTERVAL_MS);
      },
      cancel() {
        if (interval) {
          clearInterval(interval);
        }
      },
    });
  })
  .ws("/api/live", {
    body: cursorPayloadSchema,
    response: cursorPayloadSchema,
    open(ws) {
      ws.subscribe("cursors");
    },
    message(ws, payload) {
      ws.publish("cursors", payload);
    },
    close(ws) {
      ws.unsubscribe("cursors");
    },
  });

export type App = typeof app;
