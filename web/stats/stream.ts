import { systemStore } from "@web/stats/system/store";
import { serverStore } from "@web/stats/server/store";
import { websocketStore } from "@web/stats/websocket/store";
import { spotifyStore } from "@web/stats/spotify/store";
import { githubStore } from "@web/stats/github/store";
import { codexStore } from "@web/stats/codex/store";
import { statsClient } from "@web/stats/client";
import { deserializeStatsStreamEvent } from "@shared/stats/transport";

const storeDispatch: Record<string, (data: never) => void> = {
  system: (d) => systemStore.pushSample(d),
  server: (d) => serverStore.pushSample(d),
  websocket: (d) => websocketStore.pushSample(d),
  spotify: (d) => spotifyStore.pushSample(d),
  github: (d) => githubStore.pushSample(d),
  codex: (d) => codexStore.pushSample(d),
};

export async function subscribeStatsStream(signal?: AbortSignal) {
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

    const push = storeDispatch[decoded.name];
    if (push) push(decoded.data as never);
  }
}
