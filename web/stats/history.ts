import { systemStore } from "@web/stats/system/store";
import { serverStore } from "@web/stats/server/store";
import { websocketStore } from "@web/stats/websocket/store";
import { spotifyStore } from "@web/stats/spotify/store";
import { githubStore } from "@web/stats/github/store";
import { tokenUsageStore } from "@web/stats/token-usage/store";
import { statsClient } from "@web/stats/client";
import { deserializeStatsHistoryResponse } from "@shared/stats/transport";

export async function fetchStatsHistory() {
  const { data, error } = await statsClient.stats.history.get();
  if (error || !data) throw new Error("Failed to fetch stats history");
  const decoded = deserializeStatsHistoryResponse(data);

  systemStore.loadHistory(decoded.system.history, decoded.system.latest);
  serverStore.loadHistory(decoded.server.history, decoded.server.latest);
  websocketStore.loadHistory(decoded.websocket.history, decoded.websocket.latest);
  spotifyStore.loadHistory(decoded.spotify.history, decoded.spotify.latest);
  githubStore.loadHistory(decoded.github.history, decoded.github.latest);
  tokenUsageStore.loadHistory(decoded.tokenUsage.history, decoded.tokenUsage.latest);
}
