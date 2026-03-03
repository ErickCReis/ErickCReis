import { systemStore } from "@web/stats/system/store";
import { serverStore } from "@web/stats/server/store";
import { websocketStore } from "@web/stats/websocket/store";
import { spotifyStore } from "@web/stats/spotify/store";
import { githubStore } from "@web/stats/github/store";
import { codexStore } from "@web/stats/codex/store";
import { statsClient } from "@web/stats/client";

export async function fetchStatsHistory() {
  const { data, error } = await statsClient.stats.history.get();
  if (error || !data) throw new Error("Failed to fetch stats history");

  systemStore.loadHistory(data.system);
  serverStore.loadHistory(data.server);
  websocketStore.loadHistory(data.websocket);
  spotifyStore.loadHistory(data.spotify);
  githubStore.loadHistory(data.github);
  codexStore.loadHistory(data.codex);
}
