import { MAX_POINTS } from "@/features/home/constants";
import type { ServerStats, StatsBootstrap } from "@/features/home/types";

function normalizeBootstrap(payload: unknown): StatsBootstrap {
  if (!payload || typeof payload !== "object" || !("history" in payload)) {
    return { history: [] };
  }

  const history = (payload as { history?: unknown }).history;
  if (!Array.isArray(history)) {
    return { history: [] };
  }

  const sanitizedHistory = history.filter((sample): sample is ServerStats => {
    if (!sample || typeof sample !== "object") {
      return false;
    }

    const candidate = sample as Partial<ServerStats>;
    return (
      typeof candidate.timestamp === "string" &&
      typeof candidate.uptimeSeconds === "number" &&
      typeof candidate.memoryRssMb === "number" &&
      typeof candidate.memoryHeapUsedMb === "number" &&
      typeof candidate.memoryHeapTotalMb === "number" &&
      typeof candidate.systemMemoryTotalMb === "number" &&
      typeof candidate.systemMemoryFreeMb === "number" &&
      typeof candidate.systemMemoryUsedPercent === "number" &&
      typeof candidate.cpuCount === "number" &&
      typeof candidate.cpuUsagePercent === "number" &&
      Array.isArray(candidate.loadAverage) &&
      typeof candidate.loadAverage[0] === "number" &&
      typeof candidate.loadAverage[1] === "number" &&
      typeof candidate.loadAverage[2] === "number" &&
      typeof candidate.pendingRequests === "number" &&
      typeof candidate.pendingWebSockets === "number" &&
      typeof candidate.cursorSubscribers === "number"
    );
  });

  return {
    history: sanitizedHistory.slice(-MAX_POINTS),
  };
}

function createStatsBootstrapResource() {
  let status: "pending" | "success" = "pending";
  let bootstrap: StatsBootstrap = { history: [] };

  const suspender = fetch("/api/stats/bootstrap", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as unknown;
    })
    .then((payload) => {
      bootstrap = normalizeBootstrap(payload);
    })
    .catch(() => {
      bootstrap = { history: [] };
    })
    .finally(() => {
      status = "success";
    });

  return {
    read() {
      if (status === "pending") {
        throw suspender;
      }

      return bootstrap;
    },
  };
}

export const statsBootstrapResource = createStatsBootstrapResource();
