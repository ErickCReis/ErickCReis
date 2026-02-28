import { createSignal } from "solid-js";
import { CursorPresenceLayer } from "@/components/cursor-presence-layer";
import { TelemetryBackdrop } from "@/components/telemetry-backdrop";
import { useCursorPresence } from "@/hooks/use-cursor-presence";

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
