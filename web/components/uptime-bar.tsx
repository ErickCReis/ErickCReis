import { createSignal, For } from "solid-js";

type UptimeBarProps = {
  days: { date: string; uptimePercent: number }[];
};

const COLOR_GREEN = "#34d399";
const COLOR_YELLOW = "#fbbf24";
const COLOR_RED = "#f87171";

function getBarColor(pct: number) {
  if (pct >= 99.5) return COLOR_GREEN;
  if (pct >= 95) return COLOR_YELLOW;
  return COLOR_RED;
}

export function UptimeBar(props: UptimeBarProps) {
  const [tooltip, setTooltip] = createSignal<{ date: string; pct: number } | null>(null);

  return (
    <div class="relative">
      <div class="flex h-6 items-end gap-[1px]">
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
              aria-label={`${day.date}: ${day.uptimePercent.toFixed(1)}% uptime`}
              onMouseEnter={() => setTooltip({ date: day.date, pct: day.uptimePercent })}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip({ date: day.date, pct: day.uptimePercent })}
              onBlur={() => setTooltip(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setTooltip((prev) =>
                    prev ? null : { date: day.date, pct: day.uptimePercent },
                  );
                } else if (e.key === "Escape") {
                  setTooltip(null);
                }
              }}
            />
          )}
        </For>
      </div>
      {tooltip() && (
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-slate-200/15 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[0.46rem] text-slate-200/80">
          {tooltip()!.date} — {tooltip()!.pct.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
