import { Elysia, sse } from "elysia";
import { z } from "zod";
import {
  latestStats,
  setRuntimeSnapshotProvider,
  startStatsSampler,
  statsHistory,
  STATS_SAMPLE_INTERVAL_MS,
} from "./stats";

const cursorPayloadSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
});

export function createApp() {
  let pendingWebSockets = 0;
  let cursorSubscribers = 0;

  setRuntimeSnapshotProvider(() => ({
    pendingRequests: 0,
    pendingWebSockets,
    cursorSubscribers,
  }));
  startStatsSampler();

  return new Elysia({
    prefix: "/api",
  })
    .get("/stats", () => latestStats)
    .get("/stats/history", ({ set }) => {
      set.headers["cache-control"] = "no-store";
      return statsHistory;
    })
    .get("/stats/stream", async function* ({ set }) {
      set.headers["cache-control"] = "no-store";

      while (true) {
        yield sse({ event: "stats", data: latestStats });
        await Bun.sleep(STATS_SAMPLE_INTERVAL_MS);
      }
    })
    .ws("/live", {
      body: cursorPayloadSchema,
      response: cursorPayloadSchema,
      open(ws) {
        pendingWebSockets += 1;
        cursorSubscribers += 1;
        ws.subscribe("cursors");
      },
      message(ws, payload) {
        ws.publish("cursors", payload);
      },
      close(ws) {
        pendingWebSockets = Math.max(0, pendingWebSockets - 1);
        cursorSubscribers = Math.max(0, cursorSubscribers - 1);
        ws.unsubscribe("cursors");
      },
    });
}

export type App = ReturnType<typeof createApp>;
