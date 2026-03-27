import { createMemo } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelHeader,
  PanelSubtitle,
  PanelChart,
  PanelFooter,
} from "@web/components/stat-panel";
import { BarChart } from "@web/components/bar-chart";
import { codexStore } from "@web/stats/codex/store";
import {
  formatCompactTokenCount,
  formatTokenCount,
  formatGeneratedAt,
} from "@web/stats/codex/utils";
import { getMessages, type Locale } from "@web/i18n";

const PRIMARY_COLOR = "#7fb0ff";

export function CodexPanel(props: { locale: Locale }) {
  const t = getMessages(props.locale);
  const latest = createMemo(() => codexStore.latest());
  const todayTokens = createMemo(() => latest()?.todayTokens ?? 0);
  const totalTokens30d = createMemo(() => latest()?.totalTokens30d ?? 0);
  const daily = createMemo(() => latest()?.daily ?? []);

  const bars = createMemo(() => {
    const d = daily();
    const last7 = d.slice(-7);
    return last7.map((entry) => ({
      label: entry.date.slice(5).replace("-", "/"),
      value: entry.totalTokens,
    }));
  });

  const current = createMemo(() =>
    latest() ? `${formatCompactTokenCount(todayTokens())} tokens` : t.telemetry.awaitingSync,
  );

  return (
    <>
      <PanelTrigger tag="codex" current={current()} />
      <PanelContent>
        <PanelHeader locale={props.locale} title={t.telemetry.codexUsage} />
        <PanelSubtitle>
          <span>{t.telemetry.tokensToday(formatTokenCount(todayTokens()))}</span>
        </PanelSubtitle>
        <PanelChart>
          <BarChart bars={bars()} color={PRIMARY_COLOR} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t.telemetry.total30d, value: formatTokenCount(totalTokens30d()) },
            { label: t.telemetry.updated, value: formatGeneratedAt(latest()?.generatedAt ?? null) },
          ]}
        />
      </PanelContent>
    </>
  );
}

CodexPanel.primaryColor = PRIMARY_COLOR;
CodexPanel.id = "codex" as const;
