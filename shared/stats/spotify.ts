import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const spotifyNowPlayingSchema = v.object({
  isConfigured: v.boolean(),
  isPlaying: v.boolean(),
  trackId: v.nullable(v.string()),
  trackName: v.nullable(v.string()),
  artistNames: v.array(v.string()),
  albumName: v.nullable(v.string()),
  trackUrl: v.nullable(v.string()),
  progressMs: nonNegativeNumber,
  durationMs: nonNegativeNumber,
  fetchedAt: nonNegativeNumber,
});
export type SpotifyNowPlaying = v.InferOutput<typeof spotifyNowPlayingSchema>;
