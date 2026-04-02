import { Elysia, sse } from "elysia";
import { serializeStatsStreamEvent } from "@shared/stats/transport";
import { buildStatsHistoryResponse } from "@server/stats/history";
import { codexStat } from "@server/stats/codex";
import { githubStat } from "@server/stats/github";
import { serverInfoStat } from "@server/stats/server";
import { spotifyStat } from "@server/stats/spotify";
import { systemStat } from "@server/stats/system";
import { websocketStat } from "@server/stats/websocket";

const SSE_POLL_INTERVAL_MS = 500;

const statModules = [
  { name: "system" as const, mod: systemStat },
  { name: "server" as const, mod: serverInfoStat },
  { name: "websocket" as const, mod: websocketStat },
  { name: "spotify" as const, mod: spotifyStat },
  { name: "github" as const, mod: githubStat },
  { name: "codex" as const, mod: codexStat },
];

export const statsRoutes = new Elysia({ name: "stats-routes" })
  .get("/stats/history", ({ set }) => {
    set.headers["cache-control"] = "no-store";
    return buildStatsHistoryResponse();
  })
  .get("/stats/stream", async function* ({ set }) {
    set.headers["cache-control"] = "no-store";

    const lastSeen = new Map<string, number>();

    websocketStat.addViewer();
    try {
      while (true) {
        for (const { name, mod } of statModules) {
          const version = mod.getVersion();
          if (version > (lastSeen.get(name) ?? 0)) {
            lastSeen.set(name, version);
            const payload = serializeStatsStreamEvent(name, mod.getLatest());
            yield sse({ event: payload.e, data: payload.d });
          }
        }
        await Bun.sleep(SSE_POLL_INTERVAL_MS);
      }
    } finally {
      websocketStat.removeViewer();
    }
  });

export function startStatsServices() {
  systemStat.start();
  serverInfoStat.start();
  websocketStat.start();
  spotifyStat.start();
  githubStat.start();
  codexStat.start();
}
