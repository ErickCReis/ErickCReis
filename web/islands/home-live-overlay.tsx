import { createSignal } from "solid-js";
import { CursorPresenceLayer } from "@web/components/cursor-presence-layer";
import { TelemetryBackdrop } from "@web/components/telemetry-backdrop";
import { useCursorPresence } from "@web/hooks/use-cursor-presence";

export default function HomeLiveOverlay() {
  const { selfId, cursors } = useCursorPresence();
  const [isStatsHovered, setIsStatsHovered] = createSignal(false);

  return (
    <>
      <TelemetryBackdrop onStatsHoverChange={setIsStatsHovered} />
      <CursorPresenceLayer
        selfId={selfId()}
        cursors={cursors()}
        isStatsHovered={isStatsHovered()}
      />
    </>
  );
}
