import { systemStat } from "@server/stats/system";
import { serverInfoStat } from "@server/stats/server";
import { websocketStat } from "@server/stats/websocket";
import { spotifyStat } from "@server/stats/spotify";
import { githubStat } from "@server/stats/github";
import { codexStat } from "@server/stats/codex";
import { serializeStatsHistoryResponse } from "@shared/stats/transport";

export function buildStatsHistoryResponse() {
  return serializeStatsHistoryResponse({
    system: {
      latest: systemStat.getLatest(),
      history: systemStat.getHistory().map((sample) => ({
        timestamp: sample.timestamp,
        cpuUsagePercent: sample.cpuUsagePercent,
        systemMemoryUsedPercent: sample.systemMemoryUsedPercent,
      })),
    },
    server: {
      latest: serverInfoStat.getLatest(),
      history: serverInfoStat.getHistory().map((sample) => ({
        timestamp: sample.timestamp,
        currentStreakSeconds: sample.currentStreakSeconds,
        uptimePercent30d: sample.uptimePercent30d,
      })),
    },
    websocket: {
      latest: websocketStat.getLatest(),
      history: websocketStat.getHistory().map((sample) => ({
        timestamp: sample.timestamp,
        connectedUsers: sample.connectedUsers,
      })),
    },
    spotify: {
      latest: spotifyStat.getLatest(),
      history: spotifyStat.getHistory().map((sample) => ({
        fetchedAt: sample.fetchedAt,
        isPlaying: sample.isPlaying,
        trackId: sample.trackId,
        trackName: sample.trackName,
        artistNames: [...sample.artistNames],
      })),
    },
    github: {
      latest: githubStat.getLatest(),
      history: githubStat.getHistory().map((sample) => ({
        fetchedAt: sample.fetchedAt,
        lastCommitDate: sample.lastCommitDate,
        commitsToday: sample.commitsToday,
        commitsThisMonth: sample.commitsThisMonth,
        commitsThisYear: sample.commitsThisYear,
      })),
    },
    codex: {
      latest: codexStat.getLatest(),
      history: codexStat.getHistory().map((sample) => ({
        timestamp: sample.timestamp,
        generatedAt: sample.generatedAt,
        isStale: sample.isStale,
        todayTokens: sample.todayTokens,
        totalTokens30d: sample.totalTokens30d,
      })),
    },
  });
}
