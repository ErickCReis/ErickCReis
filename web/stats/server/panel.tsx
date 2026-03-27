import { createMemo } from "solid-js";
import { createPolled } from "@solid-primitives/timer";
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
import { getMessages, type Locale } from "@web/i18n";

const PRIMARY_COLOR = "#8edec9";

export function ServerPanel(props: { locale: Locale }) {
  const t = getMessages(props.locale);
  const latest = createMemo(() => serverStore.latest());
  const now = createPolled(
    () => Date.now(),
    () => (latest()?.currentStreakSeconds ? 1000 : false),
    Date.now(),
  );
  const uptimePct = createMemo(() => latest()?.uptimePercent30d ?? 0);
  const version = createMemo(() => latest()?.appVersion ?? "v0.0.0");
  const dailyUptime = createMemo(() => latest()?.dailyUptime ?? []);
  const daysWithData = createMemo(() => dailyUptime().filter((day) => day.uptimePercent !== null));
  const liveStreak = createMemo(() => {
    const snapshot = latest();
    if (!snapshot || snapshot.currentStreakSeconds <= 0) return 0;
    return (
      snapshot.currentStreakSeconds + Math.max(0, Math.floor((now() - snapshot.timestamp) / 1000))
    );
  });
  const uptimeSummary = createMemo(() => {
    const days = daysWithData();
    const percent = `${uptimePct().toFixed(1)}%`;
    const startDate = days[0]?.date;
    if (!startDate) return t.telemetry.uptimeOnly(percent);
    return t.telemetry.uptimeSince(percent, startDate);
  });
  const uptimeWindow = createMemo(() => {
    const days = daysWithData();
    const startDate = days[0]?.date;
    if (!startDate) return t.telemetry.noData;
    const label = days.length === 1 ? t.telemetry.day : t.telemetry.days;
    return `${startDate} (${days.length} ${label})`;
  });

  return (
    <>
      <PanelTrigger tag="uptime" current={formatStreak(liveStreak())} />
      <PanelContent>
        <PanelHeader locale={props.locale} title={t.telemetry.uptime} />
        <PanelSubtitle>
          <span>{uptimeSummary()}</span>
        </PanelSubtitle>
        <PanelChart class="h-auto">
          <UptimeBar days={dailyUptime()} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t.telemetry.uptime, value: `${uptimePct().toFixed(1)}%` },
            { label: t.telemetry.window, value: uptimeWindow() },
            { label: t.telemetry.version, value: version() },
          ]}
        />
      </PanelContent>
    </>
  );
}

ServerPanel.primaryColor = PRIMARY_COLOR;
ServerPanel.id = "server" as const;
