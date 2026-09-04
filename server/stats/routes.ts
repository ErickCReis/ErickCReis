import { Elysia, sse } from "elysia";
import { serializeStatsStreamEvent } from "@shared/stats/transport";
import { buildStatsHistoryResponse } from "@server/stats/history";
import { tokenUsageStat } from "@server/stats/token-usage";
import { githubStat } from "@server/stats/github";
import { serverInfoStat } from "@server/stats/server";
import { spotifyStat } from "@server/stats/spotify";
import { systemStat } from "@server/stats/system";
import { websocketStat } from "@server/stats/websocket";

const SSE_POLL_INTERVAL_MS = 500;

const statModules = [
  {
    name: "system",
    mod: systemStat,
    serialize: () => serializeStatsStreamEvent({ name: "system", data: systemStat.getLatest() }),
  },
  {
    name: "server",
    mod: serverInfoStat,
    serialize: () =>
      serializeStatsStreamEvent({ name: "server", data: serverInfoStat.getLatest() }),
  },
  {
    name: "websocket",
    mod: websocketStat,
    serialize: () =>
      serializeStatsStreamEvent({ name: "websocket", data: websocketStat.getLatest() }),
  },
  {
    name: "spotify",
    mod: spotifyStat,
    serialize: () => serializeStatsStreamEvent({ name: "spotify", data: spotifyStat.getLatest() }),
  },
  {
    name: "github",
    mod: githubStat,
    serialize: () => serializeStatsStreamEvent({ name: "github", data: githubStat.getLatest() }),
  },
  {
    name: "tokenUsage",
    mod: tokenUsageStat,
    serialize: () =>
      serializeStatsStreamEvent({ name: "tokenUsage", data: tokenUsageStat.getLatest() }),
  },
];

export const statsRoutes = new Elysia({ name: "stats-routes" })
  .get("/stats/history", ({ set }) => {
    set.headers["cache-control"] = "no-store";
    return buildStatsHistoryResponse();
  })
  .get("/stats/stream", async function* ({ set }) {
    set.headers["cache-control"] = "no-store";

    const lastSeen = new Map<string, number>();

    while (true) {
      for (const { name, mod, serialize } of statModules) {
        const version = mod.getVersion();
        if (version > (lastSeen.get(name) ?? 0)) {
          lastSeen.set(name, version);
          const payload = serialize();
          yield sse({ event: payload.e, data: payload.d });
        }
      }
      await Bun.sleep(SSE_POLL_INTERVAL_MS);
    }
  });

export function startStatsServices() {
  systemStat.start();
  serverInfoStat.start();
  websocketStat.start();
  spotifyStat.start();
  githubStat.start();
  tokenUsageStat.start();
}
