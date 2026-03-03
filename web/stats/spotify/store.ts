import { createSignal } from "solid-js";
import type { SpotifyNowPlaying } from "@shared/stats/spotify";
import { MAX_POINTS } from "@web/stats/utils";

const [latest, setLatest] = createSignal<SpotifyNowPlaying | null>(null);
const [history, setHistory] = createSignal<SpotifyNowPlaying[]>([]);

export const spotifyStore = {
  latest,
  history,
  pushSample(data: SpotifyNowPlaying) {
    setLatest(data);
    setHistory((prev) => [...prev, data].slice(-MAX_POINTS));
  },
  loadHistory(data: SpotifyNowPlaying[]) {
    setHistory((prev) => {
      const merged = new Map<number, SpotifyNowPlaying>();
      for (const s of prev) merged.set(s.fetchedAt, s);
      for (const s of data) merged.set(s.fetchedAt, s);
      const sorted = [...merged.values()]
        .sort((a, b) => a.fetchedAt - b.fetchedAt)
        .slice(-MAX_POINTS);
      if (sorted.length > 0) setLatest(sorted.at(-1)!);
      return sorted;
    });
  },
};
