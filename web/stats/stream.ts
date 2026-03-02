import type { StatEventName } from "@shared/stats/types";
import { systemStore } from "@web/stats/system/store";
import { serverStore } from "@web/stats/server/store";
import { websocketStore } from "@web/stats/websocket/store";
import { spotifyStore } from "@web/stats/spotify/store";
import { githubStore } from "@web/stats/github/store";
import { codexStore } from "@web/stats/codex/store";
import { statsClient } from "@web/stats/client";

const storeDispatch: Record<StatEventName, (data: never) => void> = {
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
    const push = storeDispatch[chunk.event as StatEventName];
    if (push) push(chunk.data as never);
  }
}
