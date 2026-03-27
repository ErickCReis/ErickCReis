import { createSignal } from "solid-js";
import { CursorPresenceLayer } from "@web/components/cursor-presence-layer";
import { TelemetryBackdrop } from "@web/components/telemetry-backdrop";
import { useCursorPresence } from "@web/hooks/use-cursor-presence";
import type { Locale } from "@web/i18n";

export default function HomeLiveOverlay(props: { locale: Locale }) {
  const { selfId, cursors } = useCursorPresence();
  const [isStatsHovered, setIsStatsHovered] = createSignal(false);

  return (
    <>
      <TelemetryBackdrop
        locale={props.locale}
        placement="hero"
        onStatsHoverChange={setIsStatsHovered}
      />
      <CursorPresenceLayer
        selfId={selfId()}
        cursors={cursors()}
        isStatsHovered={isStatsHovered()}
        locale={props.locale}
      />
    </>
  );
}
