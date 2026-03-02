import { createMemo } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelTitle,
  PanelTrend,
  PanelHint,
  PanelDetails,
  PanelHistoryList,
} from "@web/components/stat-panel";
import { spotifyStore } from "@web/stats/spotify/store";
import { formatDuration, getRecentSpotifyTracks } from "@web/stats/spotify/utils";

const PRIMARY_COLOR = "#1db954";

export function SpotifyPanel() {
  const latest = createMemo(() => spotifyStore.latest());
  const trackName = createMemo(() => latest()?.trackName ?? "Nothing playing");
  const artists = createMemo(() => latest()?.artistNames.join(", ") || "No artist");
  const album = createMemo(() => latest()?.albumName ?? "No album");
  const status = createMemo(() => {
    const s = latest();
    if (!s?.isConfigured) return "Not configured";
    return s.isPlaying ? "Playing" : "Idle";
  });
  const progressLabel = createMemo(() => {
    const s = latest();
    if (s && s.durationMs > 0)
      return `${formatDuration(s.progressMs)} / ${formatDuration(s.durationMs)}`;
    return "--:-- / --:--";
  });
  const hint = createMemo(() => {
    const s = latest();
    if (!s?.isConfigured) return "Spotify is not configured for this deployment";
    return s.isPlaying
      ? "Current Spotify playback for this account"
      : "Spotify is connected but nothing is currently playing";
  });
  const recentTracks = createMemo(() =>
    getRecentSpotifyTracks(spotifyStore.history(), latest()?.trackId ?? null),
  );

  return (
    <>
      <PanelTrigger tag="spotify/live" current={trackName()} />
      <PanelContent>
        <PanelTitle
          title="Now Playing"
          actionUrl={latest()?.trackUrl ?? undefined}
          actionLabel="Open"
        />
        <PanelTrend trend={artists()} />
        <PanelHistoryList
          label="Previous songs"
          items={recentTracks()}
          emptyMessage="No previous tracks in recent history."
        />
        <PanelHint hint={hint()} />
        <PanelDetails
          details={[
            { label: "Track", value: trackName() },
            { label: "Artist", value: artists() },
            { label: "Status", value: status() },
            { label: "Album", value: album() },
            { label: "Progress", value: progressLabel() },
          ]}
        />
      </PanelContent>
    </>
  );
}

SpotifyPanel.primaryColor = PRIMARY_COLOR;
SpotifyPanel.id = "spotify" as const;
