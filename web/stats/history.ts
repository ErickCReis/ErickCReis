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

  systemStore.loadHistory(data.system.history, data.system.latest);
  serverStore.loadHistory(data.server.history, data.server.latest);
  websocketStore.loadHistory(data.websocket.history, data.websocket.latest);
  spotifyStore.loadHistory(data.spotify.history, data.spotify.latest);
  githubStore.loadHistory(data.github.history, data.github.latest);
  codexStore.loadHistory(data.codex.history, data.codex.latest);
}
