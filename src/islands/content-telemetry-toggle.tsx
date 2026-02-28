import { clsx } from "clsx";
import { createSignal } from "solid-js";
import { TelemetryBackdrop } from "@/components/telemetry-backdrop";

export default function ContentTelemetryToggle() {
  const [isStatsBackdropEnabled, setIsStatsBackdropEnabled] = createSignal(true);

  return (
    <>
      {isStatsBackdropEnabled() ? <TelemetryBackdrop /> : null}
      <button
        type="button"
        onClick={() => {
          setIsStatsBackdropEnabled((previous) => !previous);
        }}
        aria-pressed={isStatsBackdropEnabled()}
        class={clsx(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.6rem] tracking-[0.16em] uppercase transition-colors",
          isStatsBackdropEnabled()
            ? "border-slate-200/35 text-slate-100/90 hover:bg-slate-900/35"
            : "border-slate-200/15 text-slate-300/70 hover:text-slate-200/90",
        )}
      >
        <span
          class={clsx(
            "inline-block size-1.5 rounded-full",
            isStatsBackdropEnabled() ? "bg-[rgb(142,199,255)]" : "bg-slate-400/60",
          )}
        />
        Stats {isStatsBackdropEnabled() ? "On" : "Off"}
      </button>
    </>
  );
}
