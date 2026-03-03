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

  return (
    <>
      <PanelTrigger tag="uptime" current={formatStreak(streak())} />
      <PanelContent>
        <PanelHeader title="Uptime" />
        <PanelSubtitle>
          <span>{uptimePct().toFixed(1)}% over 30 days</span>
        </PanelSubtitle>
        <PanelChart>
          <UptimeBar days={dailyUptime()} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: "Uptime", value: `${uptimePct().toFixed(1)}%` },
            { label: "Version", value: version() },
          ]}
        />
      </PanelContent>
    </>
  );
}

ServerPanel.primaryColor = PRIMARY_COLOR;
ServerPanel.id = "server" as const;
