import * as v from "valibot";
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
import type { TokenUsageSnapshot } from "@shared/stats/token-usage";
import {
  deserializeTokenUsageHistoryPoint,
  deserializeTokenUsageSnapshot,
  serializeTokenUsageHistoryPoint,
  serializeTokenUsageSnapshot,
  type TokenUsageHistoryPoint,
  type TokenUsageHistoryPointTuple,
  type TokenUsageSnapshotTuple,
} from "@shared/stats/token-usage.transport";
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

type StatEventCode = "sy" | "sr" | "ws" | "sp" | "gh" | "tu";

type StatsHistoryItemWire<L, H> = { l: L; h: H[] };

type StatsHistoryResponseWire = {
  sy: StatsHistoryItemWire<SystemStatTuple, SystemHistoryPointTuple>;
  sr: StatsHistoryItemWire<ServerInfoStatTuple, ServerHistoryPointTuple>;
  ws: StatsHistoryItemWire<WebSocketStatTuple, WebSocketHistoryPointTuple>;
  sp: StatsHistoryItemWire<SpotifyNowPlayingTuple, SpotifyHistoryPointTuple>;
  gh: StatsHistoryItemWire<GitHubCommitStatsTuple, GitHubHistoryPointTuple>;
  tu: StatsHistoryItemWire<TokenUsageSnapshotTuple, TokenUsageHistoryPointTuple>;
};

type StatsHistoryResponse = {
  system: { latest: SystemStat; history: SystemHistoryPoint[] };
  server: { latest: ServerInfoStat; history: ServerHistoryPoint[] };
  websocket: { latest: WebSocketStat; history: WebSocketHistoryPoint[] };
  spotify: { latest: SpotifyNowPlaying; history: SpotifyHistoryPoint[] };
  github: { latest: GitHubCommitStats; history: GitHubHistoryPoint[] };
  tokenUsage: { latest: TokenUsageSnapshot; history: TokenUsageHistoryPoint[] };
};

type StatsStreamEventWire =
  | { e: "sy"; d: SystemStatTuple }
  | { e: "sr"; d: ServerInfoStatTuple }
  | { e: "ws"; d: WebSocketStatTuple }
  | { e: "sp"; d: SpotifyNowPlayingTuple }
  | { e: "gh"; d: GitHubCommitStatsTuple }
  | { e: "tu"; d: TokenUsageSnapshotTuple };

type StatsStreamEvent =
  | { name: "system"; data: SystemStat }
  | { name: "server"; data: ServerInfoStat }
  | { name: "websocket"; data: WebSocketStat }
  | { name: "spotify"; data: SpotifyNowPlaying }
  | { name: "github"; data: GitHubCommitStats }
  | { name: "tokenUsage"; data: TokenUsageSnapshot };

const systemStatTupleSchema = v.tuple([
  v.number(),
  v.number(),
  v.number(),
  v.number(),
  v.number(),
  v.number(),
  v.nullable(v.number()),
  v.nullable(v.picklist(["charging", "discharging", "full", "unknown"])),
]) satisfies v.GenericSchema<unknown, SystemStatTuple>;

const serverInfoStatTupleSchema = v.tuple([
  v.number(),
  v.string(),
  v.number(),
  v.number(),
  v.array(v.tuple([v.string(), v.nullable(v.number())])),
]) satisfies v.GenericSchema<unknown, ServerInfoStatTuple>;

const websocketStatTupleSchema = v.tuple([
  v.number(),
  v.number(),
  v.number(),
  v.number(),
]) satisfies v.GenericSchema<unknown, WebSocketStatTuple>;

const spotifyNowPlayingTupleSchema = v.tuple([
  v.boolean(),
  v.boolean(),
  v.nullable(v.string()),
  v.nullable(v.string()),
  v.array(v.string()),
  v.nullable(v.string()),
  v.nullable(v.string()),
  v.number(),
  v.number(),
  v.number(),
]) satisfies v.GenericSchema<unknown, SpotifyNowPlayingTuple>;

const gitHubCommitStatsTupleSchema = v.tuple([
  v.boolean(),
  v.string(),
  v.nullable(v.string()),
  v.number(),
  v.array(v.number()),
  v.array(v.string()),
  v.number(),
  v.number(),
  v.number(),
]) satisfies v.GenericSchema<unknown, GitHubCommitStatsTuple>;

const tokenUsageSnapshotTupleSchema = v.tuple([
  v.number(),
  v.nullable(v.number()),
  v.boolean(),
  v.number(),
  v.number(),
  v.array(v.string()),
  v.array(v.tuple([v.string(), v.number(), v.array(v.number())])),
]) satisfies v.GenericSchema<unknown, TokenUsageSnapshotTuple>;

const statEventCodes = {
  system: "sy",
  server: "sr",
  websocket: "ws",
  spotify: "sp",
  github: "gh",
  tokenUsage: "tu",
} satisfies Record<StatEventName, StatEventCode>;

const statEventNames = {
  sy: "system",
  sr: "server",
  ws: "websocket",
  sp: "spotify",
  gh: "github",
  tu: "tokenUsage",
} satisfies Record<StatEventCode, StatEventName>;

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
    tu: {
      l: serializeTokenUsageSnapshot(data.tokenUsage.latest),
      h: data.tokenUsage.history.map(serializeTokenUsageHistoryPoint),
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
    tokenUsage: {
      latest: deserializeTokenUsageSnapshot(wire.tu.l),
      history: wire.tu.h.map(deserializeTokenUsageHistoryPoint),
    },
  };
}

export function serializeStatsStreamEvent(event: StatsStreamEvent): StatsStreamEventWire {
  switch (event.name) {
    case "system":
      return { e: statEventCodes[event.name], d: serializeSystemStat(event.data) };
    case "server":
      return { e: statEventCodes[event.name], d: serializeServerInfoStat(event.data) };
    case "websocket":
      return { e: statEventCodes[event.name], d: serializeWebSocketStat(event.data) };
    case "spotify":
      return { e: statEventCodes[event.name], d: serializeSpotifyNowPlaying(event.data) };
    case "github":
      return { e: statEventCodes[event.name], d: serializeGitHubCommitStats(event.data) };
    case "tokenUsage":
      return {
        e: statEventCodes[event.name],
        d: serializeTokenUsageSnapshot(event.data),
      };
  }
}

export function deserializeStatsStreamEvent(wire: { e: string; d: unknown }): StatsStreamEvent {
  switch (wire.e) {
    case "sy":
      return {
        name: statEventNames[wire.e],
        data: deserializeSystemStat(v.parse(systemStatTupleSchema, wire.d)),
      };
    case "sr":
      return {
        name: statEventNames[wire.e],
        data: deserializeServerInfoStat(v.parse(serverInfoStatTupleSchema, wire.d)),
      };
    case "ws":
      return {
        name: statEventNames[wire.e],
        data: deserializeWebSocketStat(v.parse(websocketStatTupleSchema, wire.d)),
      };
    case "sp":
      return {
        name: statEventNames[wire.e],
        data: deserializeSpotifyNowPlaying(v.parse(spotifyNowPlayingTupleSchema, wire.d)),
      };
    case "gh":
      return {
        name: statEventNames[wire.e],
        data: deserializeGitHubCommitStats(v.parse(gitHubCommitStatsTupleSchema, wire.d)),
      };
    case "tu":
      return {
        name: statEventNames[wire.e],
        data: deserializeTokenUsageSnapshot(v.parse(tokenUsageSnapshotTupleSchema, wire.d)),
      };
  }

  throw new Error(`Unknown stats stream event code: ${wire.e}`);
}
