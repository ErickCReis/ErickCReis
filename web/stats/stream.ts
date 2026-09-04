import { systemStore } from "@web/stats/system/store";
import { serverStore } from "@web/stats/server/store";
import { websocketStore } from "@web/stats/websocket/store";
import { spotifyStore } from "@web/stats/spotify/store";
import { githubStore } from "@web/stats/github/store";
import { tokenUsageStore } from "@web/stats/token-usage/store";
import { statsClient } from "@web/stats/client";
import { deserializeStatsStreamEvent } from "@shared/stats/transport";

const RECONNECT_DELAY_MS = 1_000;

function pushStreamEvent(event: ReturnType<typeof deserializeStatsStreamEvent>) {
  switch (event.name) {
    case "system":
      systemStore.pushSample(event.data);
      break;
    case "server":
      serverStore.pushSample(event.data);
      break;
    case "websocket":
      websocketStore.pushSample(event.data);
      break;
    case "spotify":
      spotifyStore.pushSample(event.data);
      break;
    case "github":
      githubStore.pushSample(event.data);
      break;
    case "tokenUsage":
      tokenUsageStore.pushSample(event.data);
      break;
  }
}

export async function subscribeStatsStream(signal?: AbortSignal) {
  while (!signal?.aborted) {
    try {
      const { data, error } = await statsClient.stats.stream.get({ fetch: { signal } });
      if (error || !data) throw new Error("Failed to subscribe to stats stream");

      for await (const chunk of data) {
        let decoded;
        try {
          decoded = deserializeStatsStreamEvent({ e: chunk.event, d: chunk.data });
        } catch (error) {
          console.warn("[stats] Ignoring malformed stream event", error);
          continue;
        }

        pushStreamEvent(decoded);
      }
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      console.warn("[stats] Stream disconnected, retrying", error);
    }

    if (signal?.aborted) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, RECONNECT_DELAY_MS);
      signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }
}
