import { createMemo, Show } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelHeader,
  PanelSubtitle,
  PanelChart,
  PanelFooter,
} from "@web/components/stat-panel";
import { ProgressBar } from "@web/components/progress-bar";
import { spotifyStore } from "@web/stats/spotify/store";
import { getPreviousTrack } from "@web/stats/spotify/utils";
import { getMessages, type Locale } from "@web/i18n";

const PRIMARY_COLOR = "#1db954";

export function SpotifyPanel(props: { locale: Locale }) {
  const t = getMessages(props.locale);
  const latest = createMemo(() => spotifyStore.latest());
  const trackName = createMemo(() => latest()?.trackName ?? t.telemetry.nothingPlaying);
  const artists = createMemo(() => latest()?.artistNames.join(", ") || t.telemetry.noArtist);
  const progressMs = createMemo(() => latest()?.progressMs ?? 0);
  const durationMs = createMemo(() => latest()?.durationMs ?? 0);

  const previousTrack = createMemo(() =>
    getPreviousTrack(spotifyStore.history(), latest()?.trackId ?? null),
  );

  return (
    <>
      <PanelTrigger tag="spotify" current={trackName()} />
      <PanelContent>
        <PanelHeader
          locale={props.locale}
          title={t.telemetry.nowPlaying}
          actionUrl={latest()?.trackUrl ?? undefined}
          actionLabel={t.telemetry.open}
        />
        <PanelSubtitle>
          <span>{artists()}</span>
        </PanelSubtitle>
        <PanelChart class="h-auto">
          <ProgressBar progressMs={progressMs()} durationMs={durationMs()} color={PRIMARY_COLOR} />
        </PanelChart>
        <Show when={previousTrack()}>
          {(prev) => (
            <p class="mt-1.5 truncate text-[0.48rem] text-slate-300/50">
              {t.telemetry.previously(prev().name, prev().artist)}
            </p>
          )}
        </Show>
        <PanelFooter
          details={[
            { label: t.telemetry.track, value: trackName() },
            { label: t.telemetry.artist, value: artists() },
          ]}
        />
      </PanelContent>
    </>
  );
}

SpotifyPanel.primaryColor = PRIMARY_COLOR;
SpotifyPanel.id = "spotify" as const;
