import type { SpotifyNowPlaying } from "@shared/stats/spotify";

export type SpotifyHistoryPoint = Pick<
  SpotifyNowPlaying,
  "fetchedAt" | "isPlaying" | "trackId" | "trackName" | "artistNames"
>;

export type SpotifyNowPlayingTuple = [
  boolean,
  boolean,
  string | null,
  string | null,
  string[],
  string | null,
  string | null,
  number,
  number,
  number,
];

export type SpotifyHistoryPointTuple = [number, boolean, string | null, string | null, string[]];

export function serializeSpotifyNowPlaying(sample: SpotifyNowPlaying): SpotifyNowPlayingTuple {
  return [
    sample.isConfigured,
    sample.isPlaying,
    sample.trackId,
    sample.trackName,
    sample.artistNames,
    sample.albumName,
    sample.trackUrl,
    sample.progressMs,
    sample.durationMs,
    sample.fetchedAt,
  ];
}

export function deserializeSpotifyNowPlaying(tuple: SpotifyNowPlayingTuple): SpotifyNowPlaying {
  return {
    isConfigured: tuple[0],
    isPlaying: tuple[1],
    trackId: tuple[2],
    trackName: tuple[3],
    artistNames: tuple[4],
    albumName: tuple[5],
    trackUrl: tuple[6],
    progressMs: tuple[7],
    durationMs: tuple[8],
    fetchedAt: tuple[9],
  };
}

export function serializeSpotifyHistoryPoint(
  sample: SpotifyHistoryPoint,
): SpotifyHistoryPointTuple {
  return [sample.fetchedAt, sample.isPlaying, sample.trackId, sample.trackName, sample.artistNames];
}

export function deserializeSpotifyHistoryPoint(
  tuple: SpotifyHistoryPointTuple,
): SpotifyHistoryPoint {
  return {
    fetchedAt: tuple[0],
    isPlaying: tuple[1],
    trackId: tuple[2],
    trackName: tuple[3],
    artistNames: tuple[4],
  };
}
