import type { SpotifyNowPlaying } from "@shared/stats/spotify";

type SpotifyTrackHistoryPoint = Pick<SpotifyNowPlaying, "trackId" | "trackName" | "artistNames">;

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getPreviousTrack(
  samples: SpotifyTrackHistoryPoint[],
  currentTrackId: string | null,
): { name: string; artist: string } | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i];
    if (!s?.trackId || !s.trackName) continue;
    if (s.trackId === currentTrackId) continue;
    return {
      name: s.trackName,
      artist: s.artistNames.join(", ") || "Unknown artist",
    };
  }
  return null;
}
