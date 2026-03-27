import { createSignal } from "solid-js";
import type { SpotifyNowPlaying } from "@shared/stats/spotify";
import { MAX_POINTS } from "@web/stats/utils";

type SpotifyHistoryPoint = Pick<
  SpotifyNowPlaying,
  "fetchedAt" | "isPlaying" | "trackId" | "trackName" | "artistNames"
>;

function toHistoryPoint(sample: SpotifyNowPlaying): SpotifyHistoryPoint {
  return {
    fetchedAt: sample.fetchedAt,
    isPlaying: sample.isPlaying,
    trackId: sample.trackId,
    trackName: sample.trackName,
    artistNames: [...sample.artistNames],
  };
}

const [latest, setLatest] = createSignal<SpotifyNowPlaying | null>(null);
const [history, setHistory] = createSignal<SpotifyHistoryPoint[]>([]);

export const spotifyStore = {
  latest,
  history,
  pushSample(data: SpotifyNowPlaying) {
    setLatest(data);
    setHistory((prev) => [...prev, toHistoryPoint(data)].slice(-MAX_POINTS));
  },
  loadHistory(data: SpotifyHistoryPoint[], latestSample: SpotifyNowPlaying) {
    setLatest(latestSample);
    setHistory((prev) => {
      const merged = new Map<number, SpotifyHistoryPoint>();
      for (const s of prev) merged.set(s.fetchedAt, s);
      for (const s of data) merged.set(s.fetchedAt, s);
      return [...merged.values()].sort((a, b) => a.fetchedAt - b.fetchedAt).slice(-MAX_POINTS);
    });
  },
};
