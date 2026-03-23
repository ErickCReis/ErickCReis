import { clsx } from "clsx";
import { createSignal } from "solid-js";
import { TelemetryBackdrop } from "@web/components/telemetry-backdrop";
import { getMessages, type Locale } from "@web/i18n";

export default function ContentTelemetryToggle(props: { locale: Locale }) {
  const [isStatsBackdropEnabled, setIsStatsBackdropEnabled] = createSignal(true);
  const t = getMessages(props.locale);

  return (
    <>
      {isStatsBackdropEnabled() ? <TelemetryBackdrop locale={props.locale} /> : null}
      <button
        type="button"
        onClick={() => {
          setIsStatsBackdropEnabled((previous) => !previous);
        }}
        aria-pressed={isStatsBackdropEnabled()}
        aria-label={`${t.telemetry.stats} ${isStatsBackdropEnabled() ? t.telemetry.on : t.telemetry.off}`}
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
        {t.telemetry.stats} {isStatsBackdropEnabled() ? t.telemetry.on : t.telemetry.off}
      </button>
    </>
  );
}
