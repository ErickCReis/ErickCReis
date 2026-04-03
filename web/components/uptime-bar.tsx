import { createSignal, For } from "solid-js";
import { t } from "virtual:translate";

type UptimeBarProps = {
  days: { date: string; uptimePercent: number | null }[];
};

const COLOR_GREEN = "#34d399";
const COLOR_YELLOW = "#fbbf24";
const COLOR_RED = "#f87171";
const COLOR_GRAY = "rgba(148, 163, 184, 0.28)";

function getBarColor(pct: number | null) {
  if (pct === null) return COLOR_GRAY;
  if (pct >= 99.5) return COLOR_GREEN;
  if (pct >= 95) return COLOR_YELLOW;
  return COLOR_RED;
}

export function UptimeBar(props: UptimeBarProps) {
  const [tooltip, setTooltip] = createSignal<{ date: string; pct: number | null } | null>(null);

  return (
    <div class="relative">
      <div class="flex h-4 items-end gap-[1px]">
        <For each={props.days}>
          {(day) => (
            <div
              class="flex-1 rounded-[1px] transition-opacity hover:opacity-80 focus:opacity-80 focus:outline-none focus:ring-1 focus:ring-slate-400/50"
              style={{
                "background-color": getBarColor(day.uptimePercent),
                height: "100%",
              }}
              tabIndex={0}
              role="img"
              aria-label={
                day.uptimePercent === null
                  ? `${day.date}: ${t("no uptime data")}`
                  : `${day.date}: ${day.uptimePercent.toFixed(1)}% ${t("uptime")}`
              }
              onMouseEnter={() => setTooltip({ date: day.date, pct: day.uptimePercent })}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip({ date: day.date, pct: day.uptimePercent })}
              onBlur={() => setTooltip(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setTooltip((prev) => (prev ? null : { date: day.date, pct: day.uptimePercent }));
                } else if (e.key === "Escape") {
                  setTooltip(null);
                }
              }}
            />
          )}
        </For>
      </div>
      {(() => {
        const activeTooltip = tooltip();
        if (!activeTooltip) return null;

        return (
          <div class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-slate-200/15 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[0.46rem] text-slate-200/80">
            {activeTooltip.date}{" "}
            {activeTooltip.pct === null
              ? `— ${t("No data")}`
              : `— ${activeTooltip.pct.toFixed(1)}%`}
          </div>
        );
      })()}
    </div>
  );
}
