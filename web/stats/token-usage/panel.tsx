import { t } from "virtual:translate";
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
import { tokenUsageStore } from "@web/stats/token-usage/store";
import {
  formatCompactTokenCount,
  formatTokenCount,
  formatGeneratedAt,
} from "@web/stats/token-usage/utils";

const PRIMARY_COLOR = "#7fb0ff";

export function TokenUsagePanel() {
  const latest = createMemo(() => tokenUsageStore.latest());
  const todayTokens = createMemo(() => latest()?.todayTokens ?? 0);
  const totalTokens30d = createMemo(() => latest()?.totalTokens30d ?? 0);
  const daily = createMemo(() => latest()?.daily ?? []);

  const bars = createMemo(() => {
    const d = daily();
    const last7 = d.slice(-7);
    return last7.map((entry) => ({
      label: entry.date.slice(8),
      value: entry.totalTokens,
    }));
  });

  const current = createMemo(() =>
    latest() ? `${formatCompactTokenCount(todayTokens())} tokens` : t("Awaiting sync"),
  );

  return (
    <>
      <PanelTrigger tag="tokens" current={current()} />
      <PanelContent>
        <PanelHeader title={t("Token Usage")} />
        <PanelSubtitle>
          <span>
            {formatTokenCount(todayTokens())} {t("tokens today")}
          </span>
        </PanelSubtitle>
        <PanelChart>
          <BarChart bars={bars()} color={PRIMARY_COLOR} labelFontSize={6} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t("30d total"), value: formatTokenCount(totalTokens30d()) },
            { label: t("Updated"), value: formatGeneratedAt(latest()?.generatedAt ?? null) },
          ]}
        />
      </PanelContent>
    </>
  );
}

TokenUsagePanel.primaryColor = PRIMARY_COLOR;
TokenUsagePanel.id = "tokenUsage" as const;
