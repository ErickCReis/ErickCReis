import type { SpotifyNowPlaying } from "@shared/stats/spotify";
import type { TelemetryHistoryItem } from "@web/types/home";

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getRecentSpotifyTracks(
  samples: SpotifyNowPlaying[],
  currentTrackId: string | null,
  maxItems = 3,
) {
  const results: TelemetryHistoryItem[] = [];
  const seenTrackIds = new Set<string>();

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const spotify = samples[index];
    if (!spotify?.trackId || !spotify.trackName) continue;
    if (spotify.trackId === currentTrackId || seenTrackIds.has(spotify.trackId)) continue;

    seenTrackIds.add(spotify.trackId);
    results.push({
      title: spotify.trackName,
      subtitle: spotify.artistNames.join(", ") || "Unknown artist",
    });

    if (results.length >= maxItems) break;
  }

  return results;
}
