import { createMemo } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelHeader,
  PanelSubtitle,
  PanelChart,
  PanelFooter,
} from "@web/components/stat-panel";
import { UptimeBar } from "@web/components/uptime-bar";
import { serverStore } from "@web/stats/server/store";
import { formatStreak } from "@web/stats/server/utils";

const PRIMARY_COLOR = "#8edec9";

export function ServerPanel() {
  const latest = createMemo(() => serverStore.latest());
  const streak = createMemo(() => latest()?.currentStreakSeconds ?? 0);
  const uptimePct = createMemo(() => latest()?.uptimePercent30d ?? 0);
  const version = createMemo(() => latest()?.appVersion ?? "v0.0.0");
  const dailyUptime = createMemo(() => latest()?.dailyUptime ?? []);
  const uptimeSummary = createMemo(() => {
    const days = dailyUptime();
    const percent = `${uptimePct().toFixed(1)}%`;
    const startDate = days[0]?.date;
    if (!startDate) return `${percent} uptime`;
    return `${percent} since ${startDate}`;
  });
  const uptimeWindow = createMemo(() => {
    const days = dailyUptime();
    const startDate = days[0]?.date;
    if (!startDate) return "No data";
    const label = days.length === 1 ? "day" : "days";
    return `${startDate} (${days.length} ${label})`;
  });

  return (
    <>
      <PanelTrigger tag="uptime" current={formatStreak(streak())} />
      <PanelContent>
        <PanelHeader title="Uptime" />
        <PanelSubtitle>
          <span>{uptimeSummary()}</span>
        </PanelSubtitle>
        <PanelChart class="h-auto">
          <UptimeBar days={dailyUptime()} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: "Uptime", value: `${uptimePct().toFixed(1)}%` },
            { label: "Window", value: uptimeWindow() },
            { label: "Version", value: version() },
          ]}
        />
      </PanelContent>
    </>
  );
}

ServerPanel.primaryColor = PRIMARY_COLOR;
ServerPanel.id = "server" as const;
