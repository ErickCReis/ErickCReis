import type { CodexUsageSnapshot } from "@shared/stats/codex";
import {
  deserializeCodexHistoryPoint,
  deserializeCodexUsageSnapshot,
  serializeCodexHistoryPoint,
  serializeCodexUsageSnapshot,
  type CodexHistoryPoint,
  type CodexHistoryPointTuple,
  type CodexUsageSnapshotTuple,
} from "@shared/stats/codex.transport";
import type { GitHubCommitStats } from "@shared/stats/github";
import {
  deserializeGitHubCommitStats,
  deserializeGitHubHistoryPoint,
  serializeGitHubCommitStats,
  serializeGitHubHistoryPoint,
  type GitHubCommitStatsTuple,
  type GitHubHistoryPoint,
  type GitHubHistoryPointTuple,
} from "@shared/stats/github.transport";
import type { ServerInfoStat } from "@shared/stats/server";
import {
  deserializeServerHistoryPoint,
  deserializeServerInfoStat,
  serializeServerHistoryPoint,
  serializeServerInfoStat,
  type ServerHistoryPoint,
  type ServerHistoryPointTuple,
  type ServerInfoStatTuple,
} from "@shared/stats/server.transport";
import type { SpotifyNowPlaying } from "@shared/stats/spotify";
import {
  deserializeSpotifyHistoryPoint,
  deserializeSpotifyNowPlaying,
  serializeSpotifyHistoryPoint,
  serializeSpotifyNowPlaying,
  type SpotifyHistoryPoint,
  type SpotifyHistoryPointTuple,
  type SpotifyNowPlayingTuple,
} from "@shared/stats/spotify.transport";
import type { SystemStat } from "@shared/stats/system";
import {
  deserializeSystemHistoryPoint,
  deserializeSystemStat,
  serializeSystemHistoryPoint,
  serializeSystemStat,
  type SystemHistoryPoint,
  type SystemHistoryPointTuple,
  type SystemStatTuple,
} from "@shared/stats/system.transport";
import type { StatEventName } from "@shared/stats/types";
import type { WebSocketStat } from "@shared/stats/websocket";
import {
  deserializeWebSocketHistoryPoint,
  deserializeWebSocketStat,
  serializeWebSocketHistoryPoint,
  serializeWebSocketStat,
  type WebSocketHistoryPoint,
  type WebSocketHistoryPointTuple,
  type WebSocketStatTuple,
} from "@shared/stats/websocket.transport";

type StatEventCode = "sy" | "sr" | "ws" | "sp" | "gh" | "cx";

type StatsHistoryItemWire<L, H> = { l: L; h: H[] };

type StatsHistoryResponseWire = {
  sy: StatsHistoryItemWire<SystemStatTuple, SystemHistoryPointTuple>;
  sr: StatsHistoryItemWire<ServerInfoStatTuple, ServerHistoryPointTuple>;
  ws: StatsHistoryItemWire<WebSocketStatTuple, WebSocketHistoryPointTuple>;
  sp: StatsHistoryItemWire<SpotifyNowPlayingTuple, SpotifyHistoryPointTuple>;
  gh: StatsHistoryItemWire<GitHubCommitStatsTuple, GitHubHistoryPointTuple>;
  cx: StatsHistoryItemWire<CodexUsageSnapshotTuple, CodexHistoryPointTuple>;
};

type StatsHistoryResponse = {
  system: { latest: SystemStat; history: SystemHistoryPoint[] };
  server: { latest: ServerInfoStat; history: ServerHistoryPoint[] };
  websocket: { latest: WebSocketStat; history: WebSocketHistoryPoint[] };
  spotify: { latest: SpotifyNowPlaying; history: SpotifyHistoryPoint[] };
  github: { latest: GitHubCommitStats; history: GitHubHistoryPoint[] };
  codex: { latest: CodexUsageSnapshot; history: CodexHistoryPoint[] };
};

type StatsStreamEventWire = {
  e: StatEventCode;
  d:
    | SystemStatTuple
    | ServerInfoStatTuple
    | WebSocketStatTuple
    | SpotifyNowPlayingTuple
    | GitHubCommitStatsTuple
    | CodexUsageSnapshotTuple;
};

type StatsStreamEvent = {
  name: StatEventName;
  data:
    | SystemStat
    | ServerInfoStat
    | WebSocketStat
    | SpotifyNowPlaying
    | GitHubCommitStats
    | CodexUsageSnapshot;
};

const statEventCodes = {
  system: "sy",
  server: "sr",
  websocket: "ws",
  spotify: "sp",
  github: "gh",
  codex: "cx",
} as const satisfies Record<StatEventName, StatEventCode>;

const statEventNames = {
  sy: "system",
  sr: "server",
  ws: "websocket",
  sp: "spotify",
  gh: "github",
  cx: "codex",
} as const satisfies Record<StatEventCode, StatEventName>;

export function serializeStatsHistoryResponse(
  data: StatsHistoryResponse,
): StatsHistoryResponseWire {
  return {
    sy: {
      l: serializeSystemStat(data.system.latest),
      h: data.system.history.map(serializeSystemHistoryPoint),
    },
    sr: {
      l: serializeServerInfoStat(data.server.latest),
      h: data.server.history.map(serializeServerHistoryPoint),
    },
    ws: {
      l: serializeWebSocketStat(data.websocket.latest),
      h: data.websocket.history.map(serializeWebSocketHistoryPoint),
    },
    sp: {
      l: serializeSpotifyNowPlaying(data.spotify.latest),
      h: data.spotify.history.map(serializeSpotifyHistoryPoint),
    },
    gh: {
      l: serializeGitHubCommitStats(data.github.latest),
      h: data.github.history.map(serializeGitHubHistoryPoint),
    },
    cx: {
      l: serializeCodexUsageSnapshot(data.codex.latest),
      h: data.codex.history.map(serializeCodexHistoryPoint),
    },
  };
}

export function deserializeStatsHistoryResponse(
  wire: StatsHistoryResponseWire,
): StatsHistoryResponse {
  return {
    system: {
      latest: deserializeSystemStat(wire.sy.l),
      history: wire.sy.h.map(deserializeSystemHistoryPoint),
    },
    server: {
      latest: deserializeServerInfoStat(wire.sr.l),
      history: wire.sr.h.map(deserializeServerHistoryPoint),
    },
    websocket: {
      latest: deserializeWebSocketStat(wire.ws.l),
      history: wire.ws.h.map(deserializeWebSocketHistoryPoint),
    },
    spotify: {
      latest: deserializeSpotifyNowPlaying(wire.sp.l),
      history: wire.sp.h.map(deserializeSpotifyHistoryPoint),
    },
    github: {
      latest: deserializeGitHubCommitStats(wire.gh.l),
      history: wire.gh.h.map(deserializeGitHubHistoryPoint),
    },
    codex: {
      latest: deserializeCodexUsageSnapshot(wire.cx.l),
      history: wire.cx.h.map(deserializeCodexHistoryPoint),
    },
  };
}

export function serializeStatsStreamEvent(
  name: StatEventName,
  data:
    | SystemStat
    | ServerInfoStat
    | WebSocketStat
    | SpotifyNowPlaying
    | GitHubCommitStats
    | CodexUsageSnapshot,
): StatsStreamEventWire {
  switch (name) {
    case "system":
      return { e: statEventCodes[name], d: serializeSystemStat(data as SystemStat) };
    case "server":
      return { e: statEventCodes[name], d: serializeServerInfoStat(data as ServerInfoStat) };
    case "websocket":
      return { e: statEventCodes[name], d: serializeWebSocketStat(data as WebSocketStat) };
    case "spotify":
      return { e: statEventCodes[name], d: serializeSpotifyNowPlaying(data as SpotifyNowPlaying) };
    case "github":
      return { e: statEventCodes[name], d: serializeGitHubCommitStats(data as GitHubCommitStats) };
    case "codex":
      return {
        e: statEventCodes[name],
        d: serializeCodexUsageSnapshot(data as CodexUsageSnapshot),
      };
  }
}

export function deserializeStatsStreamEvent(wire: { e: string; d: unknown }): StatsStreamEvent {
  switch (wire.e) {
    case "sy":
      return {
        name: statEventNames[wire.e],
        data: deserializeSystemStat(wire.d as SystemStatTuple),
      };
    case "sr":
      return {
        name: statEventNames[wire.e],
        data: deserializeServerInfoStat(wire.d as ServerInfoStatTuple),
      };
    case "ws":
      return {
        name: statEventNames[wire.e],
        data: deserializeWebSocketStat(wire.d as WebSocketStatTuple),
      };
    case "sp":
      return {
        name: statEventNames[wire.e],
        data: deserializeSpotifyNowPlaying(wire.d as SpotifyNowPlayingTuple),
      };
    case "gh":
      return {
        name: statEventNames[wire.e],
        data: deserializeGitHubCommitStats(wire.d as GitHubCommitStatsTuple),
      };
    case "cx":
      return {
        name: statEventNames[wire.e],
        data: deserializeCodexUsageSnapshot(wire.d as CodexUsageSnapshotTuple),
      };
  }

  throw new Error(`Unknown stats stream event code: ${String((wire as { e?: unknown }).e)}`);
}
